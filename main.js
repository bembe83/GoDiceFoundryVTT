const connectedDice = new Map();

function connect()
{
	Utils.openConnectionDialog();
};

function disconnect()
{
	Utils.disconnectAll(connectedDice);
};

// Open the Bluetooth connection dialog for choosing a GoDice to connect
Hooks.on('getSceneControlButtons', (controls) => {
	controls.find(c => c.name == "token")
	.tools.push({
		name: 'connect',
		title:  game.i18n.localize('Connect'),
		icon: 'fas fa-dice',
		onClick: () => {  console.log("Dice Manager Clicked"); connect();},
		button: true
	});
	controls.find(c => c.name == "token")
	.tools.push({
		name: 'disconnect',
		title:  game.i18n.localize('Disconnect all dices'),
		icon: 'fas fa-trash',
		onClick: () => {  console.log("Disconnecting all dices"); disconnect();},
		button: true
	});
});

Hooks.on('ready', Utils.LoadStoredInfos());

GoDice.prototype.onDiceConnected = async (diceId, diceInstance) => {

	if(connectedDice.get(diceId))
	{
		console.log('Dice already connected');
	}
	else
	{
		console.log("Connecting Dice: ", diceId);
		diceInstance.setDieColor();
		diceInstance.setBatteryLevel();
		let dieType;
		dieType = await DieTypePrompt.showTypePrompt(diceInstance);
		if(!diceInstance.newConnection || dieType)
		{
			diceInstance.setDieType(dieType);
			diceInstance.diceId = diceId;
			connectedDice.set(diceId, diceInstance);
			Utils.saveDices(connectedDice);
			console.log("Dice connected: ", diceId, diceInstance.getDieType(true), diceInstance.getDieColor(true));
		}else{
			console.log("Error connecting dice");
			diceInstance.onDisconnectButtonClick();
			connectedDice.delete(diceId);
			Utils.saveDices(connectedDice);
		}
	}
};

GoDice.prototype.onRollStart = (diceId) => {
	let diceType = connectedDice.get(diceId).getDieType(true);	
	let diceColor = connectedDice.get(diceId).getDieColor(true);
	console.log("Roll Start: ", diceType, diceColor, diceId);
};

GoDice.prototype.onStable = (diceId, value, xyzArray) => {
	console.log("Stable Roll:", diceId, value, xyzArray);
	Utils.showRoll(connectedDice.get(diceId), diceId, value, "Stable");
};

GoDice.prototype.onTiltStable = (diceId, value, xyzArray) => {
	console.log("TiltStable Roll:", diceId, value, xyzArray);
	Utils.showRoll(connectedDice.get(diceId), diceId, value, "TiltStable");
};

GoDice.prototype.onFakeStable = (diceId, value, xyzArray) => {
	console.log("FakeStable Roll:", diceId, value, xyzArray);
	Utils.showRoll(connectedDice.get(diceId), diceId, value, "FakeStable");
};

GoDice.prototype.onMoveStable = (diceId, value, xyzArray) => {
	console.log("MoveStable Roll:", diceId, value, xyzArray);
	Utils.showRoll(connectedDice.get(diceId), diceId, value, "MoveStable");
};