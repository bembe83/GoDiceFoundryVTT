import { Utils } from './Utils.js';
import { DiceTypePrompt } from './DiceTypePrompt.js';

export const connectedDice = new Map();

GoDice.prototype.dieColor = 0; //BLACK
GoDice.prototype.dieBatteryLevel = 0;
GoDice.prototype.newConnection = true;

GoDice.prototype.contructor = (diceId) => {
	if(diceId != null)
	{
		this.prototype.GlobalDeviceId = diceId;
		this.prototype.newConnection = false;
	}
}

GoDice.prototype.getDiceTypeString = () => {
	return Object.keys(GoDice.diceTypes)[this.dieType];
};

GoDice.prototype.getDiceColorString = () =>	{
	return Object.keys(this.diceColour)[this.dieColor];
};

GoDice.prototype.getDieType = () => {
	return this.dieType;
};

GoDice.prototype.setDieType = (diceType) => {
	this.dieType = diceType; 
};

GoDice.prototype.getDiceColor = () => {
	return this.dieColor;
}

GoDice.prototype.setDiceColor = () => {
	let diceInstance = this;
	console.log(diceInstance);
//	if(this.bluetoothDevice.name.includes("_K_"))
//		this.dieColor = this.diceColour.BLACK;
//	else if(this.bluetoothDevice.name.includes("_R_"))
//		this.dieColor = this.diceColour.RED;
//	else if(this.bluetoothDevice.name.includes("_G_"))
//		this.dieColor = this.diceColour.GREEN;
//	else if (this.bluetoothDevice.name.includes("_B_"))
//		this.dieColor = this.diceColour.BLUE;
//	else if(this.bluetoothDevice.name.includes("_Y_"))
//		this.dieColor =  this.diceColour.YELLOW;
//	else if(this.bluetoothDevice.name.includes("_O_"))
//		this.dieColor = this.diceColour.ORANGE;
//	else 
//	{
		let characteristic;
		async() =>{
			if (diceInstance.CubeCharacteristics) {
				characteristic = diceInstance.CubeCharacteristics;
				characteristic.removeEventListener('characteristicvaluechanged', diceInstance.handleNotificationChanged.bind(diceInstance));
			}else{
				characteristic = await diceInstance.GoDiceService.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
			}
		
		
			const byteMessage = new Uint8Array(diceInstance.messageIdentifiers.DICE_COLOUR);
			await diceInstance.CubeCharacteristics.writeValue(byteMessage);
			const response = await diceInstance.CubeCharacteristics.readValue();
		}
		parseMessage(response, diceInstance.diceId);
		if(diceInstance.CubeCharacteristics)
			diceInstance.CubeCharacteristics.addEventListener('characteristicvaluechanged', diceInstance.handleNotificationChanged);
//	}
};

GoDice.prototype.onDiceConnected = (diceId, diceInstance) => {

	if(connectedDice.get(diceId))
	{
		console.log('Dice already connected');
	}
	else
	{
		console.log("Connecting Dice: ", diceId);
		let diceType;

		diceType = DiceTypePrompt.showTypePrompt(diceInstance);	
		if(!diceInstance.newConnection || diceType)
		{
			diceInstance.setDiceColor();
			connectedDice.set(diceId, diceInstance);
			Utils.saveDices(connectedDice);
			console.log("Dice connected: ", diceId, diceInstance.getDiceTypeString(), diceInstance.getDiceColorString());
		}else{
			console.log("Error connecting dice");
			diceInstance.onDisconnectButtonClick();
			connectedDice.delete(diceId);
			Utils.saveDices(connectedDice);
		}
	}
};

GoDice.prototype.onRollStart = (diceId) => {
	let diceType = connectedDice.get(diceId).getDiceTypeString();	
	let diceColor = connectedDice.get(diceId).getDiceColorString();
	console.log("Roll Start: ", diceType, diceColor, diceId);
};

GoDice.prototype.onStable = (diceId, value, xyzArray) => {
	Utils.showRoll(diceId, value, "Stable");
};

GoDice.prototype.onTiltStable = (diceId, value, xyzArray) => {
	Utils.showRoll(diceId, value, "TiltStable");
};

GoDice.prototype.onFakeStable = (diceId, value, xyzArray) => {
	Utils.showRoll(diceId, value, "FakeStable");
};

GoDice.prototype.onMoveStable = (diceId, value, xyzArray) => {
	Utils.showRoll(diceId, value, "MoveStable");
};

GoDice.prototype.onBatteryLevel = (diceId, batteryLevel) => {
	console.log("BetteryLevel: ", diceId, batteryLevel);
	this.batteryLevel = batteryLevel;
};

GoDice.prototype.onDiceColor = (diceId, color) => {
	this.dieColor = color;
}

GoDice.prototype.reConnectDeviceAndCacheCharacteristics = () => {
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
			this.onStartNotificationsButtonClick();
		});
	},{ once: true });

	this.bluetoothDevice.watchAdvertisements({ signal: abortController.signal })
	.catch(error => console.log('Argh! '+ error));
};

/**
 * Open a connection dialog to connect a single GoDice, after successfull connection it will follow by corresponding "DiceConnected" event (response).
 */
GoDice.prototype.reconnectDevice = () => {
	if (!this.GlobalDeviceId) {
		return Promise.reject(new Error('No device ID available, use requestDevice instead.'));
	}
	return navigator.bluetooth.getDevices()
		.then(devices => {	
			for(const device of devices)
			{
				if(device.id == this.GlobalDeviceId)
				{
					this.GlobalDeviceId = device.id.toString();				
					this.bluetoothDevice = device;
					this .newConnection = false;				
					this.bluetoothDevice.addEventListener('gattserverdisconnected', this.onDisconnected);				
					this.reConnectDeviceAndCacheCharacteristics();
				}	
			}			
		});
};
