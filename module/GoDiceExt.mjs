import { GoDice } from './GoDice.mjs';

export const connectedDice = new Map();
export const reloadedDice = new Map();
export const disconnectedDice = new Map();
export const rolledDice = new Map();

/**
 * @class
 * The extended GoDice class that can be used to connect a new die, send and recieve messages.
 */
export class GoDiceExt extends GoDice {

	dieColor = this.diceColour.BLACK;
	dieBatteryLevel = 0;
	newConnection = true;                                                                 
	dieFaces = 6;
	reconnect = true;
	
	getDieType (needString = false) {
		if(needString)
			return Object.keys(GoDice.diceTypes)[this.dieType];
		else
			return this.dieType;
	}

	setDieType (dieType) {
		if(isNaN(dieType))
			this.dieType = GoDice.diceTypes[dieType];
		else
			this.dieType = dieType;
		this.setDieFaces();
	}
	
	setDieFaces(dieFaces = null){
		if(!dieFaces)
			this.dieFaces = parseInt(this.getDieType(true).replace("D", "").replace("X","0"));
		else
			this.dieFaces = dieFaces;
	}
	
	getDieFaces()
	{
		return this.dieFaces;
	}

	getDieColor (needString = false) {
		if(needString)
			return Object.keys(this.diceColour)[this.dieColor];
		else
			return this.dieColor;
	}

	setDieColor () {
		console.debug(this);
		if(this.bluetoothDevice.name.includes("_K_"))
			this.dieColor = this.diceColour.BLACK;
		else if(this.bluetoothDevice.name.includes("_R_"))
			this.dieColor = this.diceColour.RED;
		else if(this.bluetoothDevice.name.includes("_G_"))
			this.dieColor = this.diceColour.GREEN;
		else if (this.bluetoothDevice.name.includes("_B_"))
			this.dieColor = this.diceColour.BLUE;
		else if(this.bluetoothDevice.name.includes("_Y_"))
			this.dieColor =  this.diceColour.GOLDENROD;
		else if(this.bluetoothDevice.name.includes("_O_"))
			this.dieColor = this.diceColour.ORANGE;
		else 
		{
			super.getDiceColor();
		}
	}

	getBatteryLevel() {
		return this.batteryLevel;
	}

	setBatteryLevel() {
		super.getBatteryLevel();
	}

	onBatteryLevel (diceId, batteryLevel) {
		console.log("BetteryLevel: ", diceId, batteryLevel);
		this.batteryLevel = batteryLevel;
	}

	onDiceColor (diceId, color) {
		console.log("DiceColor: ", diceId, color);
		this.dieColor = color;
	}

	reConnectDeviceAndCacheCharacteristics (){
		console.debug('Reconnecting to GATT Server...');

		const abortController = new AbortController();

		this.bluetoothDevice.addEventListener('advertisementreceived', (event) => {
			abortController.abort();
		 	this.bluetoothDevice.gatt.connect()
			.then(server => {
				return server.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
			})
			.then(service => {
				this.GoDiceService = service;
				return service.getCharacteristic("6e400003-b5a3-f393-e0a9-e50e24dcca9e");
			})
			.then(characteristic => {
				this.CubeCharacteristics = characteristic;
				this.CubeCharacteristics.addEventListener('characteristicvaluechanged', this.handleNotificationChanged);
				return characteristic.getDescriptors();
			})
			.then(descriptors => {
				this.setDieColor();
				this.onStartNotificationsButtonClick();
			});
		},{ once: true });

		this.bluetoothDevice.watchAdvertisements({ signal: abortController.signal })
		.catch(error => console.log('Argh! '+ error));
	}

	/**
	 * Try to reconnect a previous connected GoDice, after successfull connection it will follow by corresponding "DiceConnected" event (response).
	 */
	async reconnectDevice (dieId = null, dieType = 1) {
		this.newConnection = false;
		if(this.bluetoothDevice)
		{
			return this.connectDeviceAndCacheCharacteristics();
		}
		if(dieId)
		{
			this.diceId = dieId;
			this.setDieType(dieType);
		}
		
		if (!this.diceId) {		
			console.debug(this);
			return Promise.reject(new Error('reconnectDevice (dieId, dieType) => No device ID provided, use requestDevice instead.'));
		}
		
		return navigator.bluetooth.getDevices().then(devices => {	
			for(const device of devices)
			{
				if(device.id == this.diceId)
				{
					this.GlobalDeviceId = device.id.toString();				
					this.bluetoothDevice = device;
					this.newConnection = false;			
					this.bluetoothDevice.addEventListener('gattserverdisconnected', this.onDisconnected);				
					this.reConnectDeviceAndCacheCharacteristics();
				}	
			}			
		});
	}
	
	/**
	 * Try to reconnect a previous connected GoDice, after session refresh
	 */
	async reconnectStoredDevice (dieId = null, dieType = 1) {
		this.newConnection = false;
		if(this.bluetoothDevice)
		{
			return this.connectDeviceAndCacheCharacteristics();
		}
		if(dieId)
		{
			this.diceId = dieId;
			this.setDieType(dieType);
		}
		
		if (!this.diceId) {		
			console.debug(this);
			return Promise.reject(new Error('reconnectDevice (dieId, dieType) => No device ID provided, use requestDevice instead.'));
		}
		
		return navigator.permissions.query({name: "bluetooth", deviceId:this.diceId,}).then(results=>{
			let device = results.devices[0];
			if(device.id == this.diceId)
				{
					this.GlobalDeviceId = device.id.toString();				
					this.bluetoothDevice = device;
					this.newConnection = false;			
					this.bluetoothDevice.addEventListener('gattserverdisconnected', this.onDisconnected);				
					this.reConnectDeviceAndCacheCharacteristics();
				}
		});

	}
}
