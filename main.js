const MODULE_NAME = "go-dice-module";


Hooks.on('init', () => {
	DiceBar.init();
	GoDiceRoll.init();
});

Hooks.on("renderDiceBar", async () => {
	console.debug("DiceBar | The dice bar just rendered!");
});

Hooks.on('ready', () => {
	if (!game.modules.get('lib-wrapper')?.active && game.user.isGM) {
		ui.notifications.error(game.i18n.localize(MODULE_NAME+".Error_libWrapper_Missing"));
		return;
	}
	
	console.debug("Installing GoDiceRoll");
	GoDiceRoll.patch();
	Utils.LoadStoredInfos();
	console.debug("DiceBar | Foundry setup...");
	diceBarInit();	
});

GoDice.prototype.onDiceConnected = async (diceId, diceInstance) => {

	if (connectedDice.get(diceId)) {
		console.log('Dice already connected');
	}
	else {
		console.log("Connecting Dice: ", diceId);
		diceInstance.setDieColor();
		diceInstance.setBatteryLevel();
		let dieType;
		let diePrompt = new DieTypePrompt();
		dieType = await diePrompt.showTypePrompt(diceInstance);
		if (!diceInstance.newConnection || dieType) {
			diceInstance.setDieType(dieType);
			diceInstance.diceId = diceId;
			connectedDice.set(diceId, diceInstance);
			Utils.addDieToBar(diceId);
			Utils.saveDices();
			console.log("Dice connected: ", diceId, diceInstance.getDieType(true), diceInstance.getDieColor(true));
		} else {
			console.log("Error connecting dice");
			Utils.disconendDice(diceId);
		}
	}
};

GoDice.prototype.onRollStart = (diceId) => {
	let diceType = connectedDice.get(diceId).getDieType(true);
	let diceColor = connectedDice.get(diceId).getDieColor(true);
	console.log("Roll Start: ", diceType, diceColor);
};

GoDice.prototype.onStable = (diceId, value, xyzArray) => {
	console.log("Stable Roll:", diceId, value, xyzArray);
	Utils.startTimeout(diceId, value, "Stable");
};

GoDice.prototype.onTiltStable = (diceId, value, xyzArray) => {
	console.log("TiltStable Roll:", diceId, value, xyzArray);
	Utils.startTimeout(diceId, value, "TiltStable");
};

GoDice.prototype.onFakeStable = (diceId, value, xyzArray) => {
	console.log("FakeStable Roll:", diceId, value, xyzArray);
	Utils.startTimeout(diceId, value, "FakeStable");
};

GoDice.prototype.onMoveStable = (diceId, value, xyzArray) => {
	console.log("MoveStable Roll:", diceId, value, xyzArray);
	Utils.startTimeout(diceId, value, "MoveStable");
};