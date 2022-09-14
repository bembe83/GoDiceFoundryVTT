/**
 * @class
 * The extended GoDice class that can be used to connect a new die, send and recieve messages.
 */
class GoDiceExt extends GoDice {

	dieColor = this.diceColour.BLACK;
	dieBatteryLevel = 0;
	newConnection = true;

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
			this.dieColor =  this.diceColour.YELLOW;
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
				this.onStartNotificationsButtonClick();
			});
		},{ once: true });

		this.bluetoothDevice.watchAdvertisements({ signal: abortController.signal })
		.catch(error => console.log('Argh! '+ error));
	}

	/**
	 * Open a connection dialog to connect a single GoDice, after successfull connection it will follow by corresponding "DiceConnected" event (response).
	 */
	reconnectDevice (dieId, dieType) {
		if (!dieId) {
			return Promise.reject(new Error('No device ID available, use requestDevice instead.'));
		}
		return navigator.bluetooth.getDevices()
			.then(devices => {	
				for(const device of devices)
				{
					if(device.id == this.dieId)
					{
						this.GlobalDeviceId = device.id.toString();				
						this.bluetoothDevice = device;
						this.newConnection = false;	
						this.setDieType(dieType);			
						this.bluetoothDevice.addEventListener('gattserverdisconnected', this.onDisconnected);				
						this.reConnectDeviceAndCacheCharacteristics();
					}	
				}			
			});
	}

	onDisconnected(event) {
		console.debug(event.target);
		connectedDice.delete(event.target.id);
	}

}
