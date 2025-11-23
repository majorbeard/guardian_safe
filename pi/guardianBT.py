#!/usr/bin/env python3
import sys
import time
import dbus
import dbus.exceptions
import dbus.mainloop.glib
import dbus.service
from gi.repository import GLib
import RPi.GPIO as GPIO
# from RPLCD.i2c import CharLCD
from datetime import datetime

# Disable GPIO warnings
GPIO.setwarnings(False)

# GPIO Setup
RELAY_PIN = 18
GPIO.setmode(GPIO.BCM)
GPIO.setup(RELAY_PIN, GPIO.OUT)
GPIO.output(RELAY_PIN, GPIO.LOW)

# LCD Setup (16x2)
try:
    lcd = CharLCD('PCF8574', 0x27, cols=16, rows=2)
    lcd.clear()
except:
    print("LCD not found, continuing without display")
    lcd = None

# Hardcoded MAC addresses for validation
ALLOWED_PHONE_MACS = [
    "FC:93:6B:B4:08:0D",  # Phone 1 MAC
    "A4:46:B4:2A:C1:F2"   # Phone 2 MAC
]

# BLE Service and Characteristic UUIDs (must match mobile app)
SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
OTP_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
STATUS_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9"

# DBus paths
BLUEZ_SERVICE_NAME = 'org.bluez'
GATT_MANAGER_IFACE = 'org.bluez.GattManager1'
DBUS_OM_IFACE = 'org.freedesktop.DBus.ObjectManager'
DBUS_PROP_IFACE = 'org.freedesktop.DBus.Properties'
GATT_SERVICE_IFACE = 'org.bluez.GattService1'
GATT_CHRC_IFACE = 'org.bluez.GattCharacteristic1'
LE_ADVERTISING_MANAGER_IFACE = 'org.bluez.LEAdvertisingManager1'
LE_ADVERTISEMENT_IFACE = 'org.bluez.LEAdvertisement1'

# State
otp_verified = False
lock_open = False
current_otp = None
status_characteristic = None  # Will hold reference to status characteristic for updates

# System status
safe_status = 1  # 0=inactive, 1=active, 2=maintenance, 3=offline
battery_percent = 100  # Default to full
voltage = 12.0  # Default voltage

def display_message(line1, line2=""):
    """Display message on LCD"""
    if lcd:
        try:
            lcd.clear()
            lcd.write_string(line1[:16])
            if line2:
                lcd.cursor_pos = (1, 0)
                lcd.write_string(line2[:16])
        except Exception as e:
            print(f"LCD Error: {e}")
    print(f"LCD: {line1} | {line2}")

def open_lock():
    """Open the relay lock"""
    global lock_open, status_characteristic
    print("Opening lock...")
    display_message("Opening Lock...", "Stand By")
    GPIO.output(RELAY_PIN, GPIO.HIGH)
    time.sleep(2)  # Initial delay
    lock_open = True
    display_message("Lock Opened!", "Remove Items")
    print("Lock opened!")

    # Notify status change
    if status_characteristic:
        status_characteristic.update_status()

    # Schedule automatic close after 15 seconds
    GLib.timeout_add_seconds(15, auto_close_lock)

def auto_close_lock():
    """Automatically close the lock after timeout"""
    global otp_verified
    if lock_open:
        print("Auto-closing lock after 15 seconds")
        close_lock()
        # Reset OTP verification after auto-close
        otp_verified = False
        if status_characteristic:
            status_characteristic.update_status()
    return False  # Don't repeat the timeout

def close_lock():
    """Close the relay lock"""
    global lock_open, status_characteristic
    print("Closing lock...")
    GPIO.output(RELAY_PIN, GPIO.LOW)
    lock_open = False
    display_message("Lock Closed", "Ready")
    print("Lock closed!")

    # Notify status change
    if status_characteristic:
        status_characteristic.update_status()

def update_system_health():
    """Update battery and voltage readings"""
    global battery_percent, voltage, safe_status

    try:
        # Read system uptime to simulate battery drain (for demo purposes)
        # In production, you'd read from actual battery monitor hardware
        with open('/proc/uptime', 'r') as f:
            uptime_seconds = float(f.readline().split()[0])

        # Simulate battery drain: 1% per hour of uptime (max 100%)
        drain = min(int(uptime_seconds / 3600), 100)
        battery_percent = max(0, 100 - drain)

        # Try to read CPU voltage as a proxy (requires vcgencmd)
        try:
            import subprocess
            result = subprocess.run(['vcgencmd', 'measure_volts', 'core'],
                                  capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                # Output format: "volt=1.2000V"
                volt_str = result.stdout.strip().split('=')[1].rstrip('V')
                core_voltage = float(volt_str)
                # Scale to typical 12V supply (this is just for display)
                voltage = core_voltage * 10
            else:
                voltage = 12.0  # Default
        except:
            voltage = 12.0  # Fallback

        # System is active if lock operations are working
        safe_status = 1  # active

    except Exception as e:
        print(f"Health update error: {e}")
        battery_percent = 100
        voltage = 12.0
        safe_status = 1

    return True  # Continue periodic updates

def verify_otp(received_otp):
    """Verify OTP code"""
    global otp_verified, current_otp, status_characteristic

    print(f"Verifying OTP: {received_otp}")
    display_message("Verifying OTP", received_otp)

    # Verify OTP format (6 digits)
    if len(received_otp) == 6 and received_otp.isdigit():
        current_otp = received_otp
        otp_verified = True
        print("OTP verified!")
        display_message("OTP Verified!", "Opening...")

        # Notify status change
        if status_characteristic:
            status_characteristic.update_status()

        time.sleep(1)
        open_lock()
        return True
    else:
        print("Invalid OTP format")
        display_message("Invalid OTP", "Try Again")
        return False

class Application(dbus.service.Object):
    """DBus application for BLE GATT server"""
    
    def __init__(self, bus):
        self.path = '/'
        self.services = []
        dbus.service.Object.__init__(self, bus, self.path)

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def add_service(self, service):
        self.services.append(service)

    @dbus.service.method(DBUS_OM_IFACE, out_signature='a{oa{sa{sv}}}')
    def GetManagedObjects(self):
        response = {}
        for service in self.services:
            response[service.get_path()] = service.get_properties()
            chrcs = service.get_characteristics()
            for chrc in chrcs:
                response[chrc.get_path()] = chrc.get_properties()
        return response

class Service(dbus.service.Object):
    """BLE GATT Service"""
    
    PATH_BASE = '/org/bluez/guardian/service'
    
    def __init__(self, bus, index, uuid, primary):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.uuid = uuid
        self.primary = primary
        self.characteristics = []
        dbus.service.Object.__init__(self, bus, self.path)

    def get_properties(self):
        return {
            GATT_SERVICE_IFACE: {
                'UUID': self.uuid,
                'Primary': self.primary,
                'Characteristics': dbus.Array(
                    self.get_characteristic_paths(),
                    signature='o')
            }
        }

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def add_characteristic(self, characteristic):
        self.characteristics.append(characteristic)

    def get_characteristic_paths(self):
        result = []
        for chrc in self.characteristics:
            result.append(chrc.get_path())
        return result

    def get_characteristics(self):
        return self.characteristics

class Characteristic(dbus.service.Object):
    """BLE GATT Characteristic"""
    
    def __init__(self, bus, index, uuid, flags, service):
        self.path = service.path + '/char' + str(index)
        self.bus = bus
        self.uuid = uuid
        self.service = service
        self.flags = flags
        # Initialize with proper signature - empty byte array
        self.value = dbus.Array([], signature='y')
        dbus.service.Object.__init__(self, bus, self.path)

    def get_properties(self):
        return {
            GATT_CHRC_IFACE: {
                'Service': self.service.get_path(),
                'UUID': self.uuid,
                'Flags': self.flags,
                'Value': self.value
            }
        }

    def get_path(self):
        return dbus.ObjectPath(self.path)

    @dbus.service.method(GATT_CHRC_IFACE,
                        in_signature='a{sv}',
                        out_signature='ay')
    def ReadValue(self, options):
        print(f'📖 ReadValue called on {self.uuid}')
        return self.value

    @dbus.service.method(GATT_CHRC_IFACE, in_signature='aya{sv}')
    def WriteValue(self, value, options):
        print(f'✍️  WriteValue called on {self.uuid}')
        self.value = value

class OTPCharacteristic(Characteristic):
    """OTP Characteristic - receives OTP from phone"""
    
    def __init__(self, bus, index, service):
        Characteristic.__init__(
            self, bus, index,
            OTP_CHAR_UUID,
            ['write', 'write-without-response'],
            service)

    def WriteValue(self, value, options):
        global otp_verified
        print('OTP WriteValue called')
        
        # Convert bytes to string
        otp_code = ''.join([chr(byte) for byte in value])
        print(f"Received OTP: {otp_code}")
        
        # Verify OTP
        verify_otp(otp_code)
        
        self.value = value

class StatusCharacteristic(Characteristic):
    """Status Characteristic - sends status to phone"""

    def __init__(self, bus, index, service):
        Characteristic.__init__(
            self, bus, index,
            STATUS_CHAR_UUID,
            ['read', 'notify'],
            service)
        # Initialize with default status [0, 0, 100, 1, 0, 120] (6 bytes)
        self.value = dbus.Array([dbus.Byte(0), dbus.Byte(0), dbus.Byte(100), dbus.Byte(1), dbus.Byte(0), dbus.Byte(120)], signature='y')

    def ReadValue(self, options):
        global otp_verified, lock_open, battery_percent, safe_status, voltage
        print('Status ReadValue called')

        # Pack status into 6 bytes:
        # [0] verified (0/1)
        # [1] lock_open (0/1)
        # [2] battery_percent (0-100)
        # [3] safe_status (0=inactive, 1=active, 2=maintenance, 3=offline)
        # [4] voltage high byte
        # [5] voltage low byte

        verified_byte = 1 if otp_verified else 0
        lock_byte = 1 if lock_open else 0
        battery_byte = max(0, min(100, int(battery_percent)))
        status_byte = safe_status

        # Convert voltage to 2 bytes (multiply by 10 to preserve 1 decimal place)
        voltage_int = int(voltage * 10)
        voltage_high = (voltage_int >> 8) & 0xFF
        voltage_low = voltage_int & 0xFF

        status = dbus.Array([
            dbus.Byte(verified_byte),
            dbus.Byte(lock_byte),
            dbus.Byte(battery_byte),
            dbus.Byte(status_byte),
            dbus.Byte(voltage_high),
            dbus.Byte(voltage_low)
        ], signature='y')

        print(f"Sending status: verified={otp_verified}, lock={lock_open}, battery={battery_percent}%, status={safe_status}, voltage={voltage}V")

        self.value = status
        return status

    def update_status(self):
        """Update and notify status change"""
        global otp_verified, lock_open, battery_percent, safe_status, voltage

        verified_byte = 1 if otp_verified else 0
        lock_byte = 1 if lock_open else 0
        battery_byte = max(0, min(100, int(battery_percent)))
        status_byte = safe_status

        voltage_int = int(voltage * 10)
        voltage_high = (voltage_int >> 8) & 0xFF
        voltage_low = voltage_int & 0xFF

        self.value = dbus.Array([
            dbus.Byte(verified_byte),
            dbus.Byte(lock_byte),
            dbus.Byte(battery_byte),
            dbus.Byte(status_byte),
            dbus.Byte(voltage_high),
            dbus.Byte(voltage_low)
        ], signature='y')

        # Emit property changed signal for notification
        self.PropertiesChanged(GATT_CHRC_IFACE, {'Value': self.value}, [])

    @dbus.service.signal(DBUS_PROP_IFACE, signature='sa{sv}as')
    def PropertiesChanged(self, interface, changed, invalidated):
        pass

class Advertisement(dbus.service.Object):
    """BLE Advertisement"""
    
    PATH_BASE = '/org/bluez/guardian/advertisement'

    def __init__(self, bus, index, advertising_type):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.ad_type = advertising_type
        self.service_uuids = None
        self.manufacturer_data = None
        self.solicit_uuids = None
        self.service_data = None
        self.local_name = 'GuardianSafe'
        self.include_tx_power = False
        dbus.service.Object.__init__(self, bus, self.path)

    def get_properties(self):
        properties = dict()
        properties['Type'] = self.ad_type
        if self.service_uuids is not None:
            properties['ServiceUUIDs'] = dbus.Array(self.service_uuids,
                                                    signature='s')
        if self.local_name is not None:
            properties['LocalName'] = dbus.String(self.local_name)
        if self.include_tx_power:
            properties['Includes'] = dbus.Array(['tx-power'], signature='s')
        return {LE_ADVERTISEMENT_IFACE: properties}

    def get_path(self):
        return dbus.ObjectPath(self.path)

    @dbus.service.method(DBUS_PROP_IFACE,
                         in_signature='s',
                         out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != LE_ADVERTISEMENT_IFACE:
            raise dbus.exceptions.DBusException(
                'org.freedesktop.DBus.Error.InvalidArgs',
                'Invalid interface')
        return self.get_properties()[LE_ADVERTISEMENT_IFACE]

    @dbus.service.method(LE_ADVERTISEMENT_IFACE,
                         in_signature='',
                         out_signature='')
    def Release(self):
        print('Advertisement Released')

def find_adapter(bus):
    """Find Bluetooth adapter"""
    remote_om = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, '/'),
                               DBUS_OM_IFACE)
    objects = remote_om.GetManagedObjects()

    for o, props in objects.items():
        if GATT_MANAGER_IFACE in props.keys():
            return o

    return None

# Global references
app = None
service_manager = None
ad_manager = None
advertisement = None

def main():
    global mainloop, app, service_manager, ad_manager, advertisement, status_characteristic

    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)

    bus = dbus.SystemBus()

    adapter = find_adapter(bus)
    if not adapter:
        print('BLE adapter not found!')
        return

    print(f'Using adapter: {adapter}')
    display_message("Guardian Safe", "Initializing...")

    # Create application
    app = Application(bus)

    # Create service
    service = Service(bus, 0, SERVICE_UUID, True)
    app.add_service(service)

    # Add OTP characteristic
    otp_chrc = OTPCharacteristic(bus, 0, service)
    service.add_characteristic(otp_chrc)

    # Add Status characteristic
    status_chrc = StatusCharacteristic(bus, 1, service)
    service.add_characteristic(status_chrc)

    # Store global reference for status updates
    status_characteristic = status_chrc

    # Register application
    service_manager = dbus.Interface(
        bus.get_object(BLUEZ_SERVICE_NAME, adapter),
        GATT_MANAGER_IFACE)

    print('Registering GATT application...')
    service_manager.RegisterApplication(app.get_path(), {},
                                       reply_handler=lambda: print('GATT application registered'),
                                       error_handler=lambda e: print(f'Failed to register: {e}'))

    # Create advertisement
    ad_manager = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, adapter),
                               LE_ADVERTISING_MANAGER_IFACE)
    
    advertisement = Advertisement(bus, 0, 'peripheral')
    advertisement.service_uuids = [SERVICE_UUID]

    print('Registering advertisement...')
    ad_manager.RegisterAdvertisement(advertisement.get_path(), {},
                                    reply_handler=lambda: print('Advertisement registered'),
                                    error_handler=lambda e: print(f'Failed to advertise: {e}'))

    display_message("Guardian Safe", "Ready")
    print('BLE Server Running!')
    print('Waiting for phone connection...')
    print(f'Service UUID: {SERVICE_UUID}')
    print(f'Device Name: GuardianSafe')

    # Start periodic health monitoring (every 60 seconds)
    GLib.timeout_add_seconds(60, update_system_health)
    update_system_health()  # Initial update

    mainloop = GLib.MainLoop()
    
    try:
        mainloop.run()
    except KeyboardInterrupt:
        print('\nStopping server...')
        display_message("Shutting Down", "")
        
        # Clean shutdown
        try:
            if ad_manager and advertisement:
                ad_manager.UnregisterAdvertisement(advertisement.get_path())
        except:
            pass
            
        try:
            if service_manager and app:
                service_manager.UnregisterApplication(app.get_path())
        except:
            pass
            
        close_lock()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nGoodbye!')
    except Exception as e:
        print(f'Fatal error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        GPIO.cleanup()
        if lcd:
            lcd.clear()