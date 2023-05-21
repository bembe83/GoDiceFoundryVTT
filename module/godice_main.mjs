import { diceBarInit, DiceBar } from './DiceBar.mjs';
import { GoDice } from './GoDice.mjs';
import { connectedDice, disconnectedDice } from './GoDiceExt.mjs';
import { GoDiceRoll } from './GoDiceRoll.mjs';
import { MODULE_NAME, Utils, rollTimer } from './Utils.mjs';

Hooks.on('init', () => {
	DiceBar.init();
	GoDiceRoll.init();
	
    game.socket.on("module.go-dice-module", Utils.handleRemoteRoll.bind(null,event));
});

Hooks.on("renderDiceBar", async () => {
	console.debug("DiceBar | The dice bar just rendered!");
});

Hooks.on('ready', () => {
	if (!game.modules.get('lib-wrapper')?.active && game.user.isGM) {
		ui.notifications.error(game.i18n.localize(MODULE_NAME+".Error_libWrapper_Missing"));
		return;
	}
	
	Utils.disableManualRollModule();
	
	console.debug("Installing GoDiceRoll");
	GoDiceRoll.patch();
	Utils.LoadStoredInfos();
	Utils.reconnectDice();
	setInterval(function() { Utils.reconnectDice(); }, 5000);
	console.debug("DiceBar | Foundry setup...");
	diceBarInit();		
});

GoDice.prototype.onDiceConnected = (diceId, diceInstance) => {

	if (connectedDice.get(diceId)) {
		console.log('Dice already connected');
	}else{
		let dieType = GoDice.diceTypes.D20;
		if(disconnectedDice?.get(diceId))  {
			console.log("Reconnecting Dice: ", diceId);;
			connectedDice.set(diceId, disconnectedDice.get(diceId));
			disconnectedDice.delete(diceId);
		}else{
			/*if(!dieType) {
				let diePrompt = new DieTypePrompt();
				dieType = await diePrompt.showTypePrompt(diceInstance);
			}*/
			if (diceInstance.newConnection && dieType) {
				console.log("Connecting New Dice: ", diceId);
				connectedDice.set(diceId, diceInstance);
				diceInstance.diceId = diceId;
				diceInstance.setDieType(dieType);
				diceInstance.setDieColor();
				diceInstance.setBatteryLevel();
			} else if(!diceInstance.newConnection){
				console.log("Connecting Stored Dice: ", diceId);
				connectedDice.set(diceId, diceInstance);
			}else{
				console.log("Error connecting dice");
				Utils.disconnectDice(diceId);
			}
		}
		Utils.saveDices();
		ui.dicebar.render(true);
		console.log("Dice connected: ", diceId, diceInstance.getDieType(true), diceInstance.getDieColor(true));
	}
};

GoDice.prototype.onDisconnected = (event) => {
	console.debug(event);
	let diceId = event.target.id;
	if(connectedDice.get(diceId)?.reconnect)
		disconnectedDice.set(diceId, connectedDice.get(diceId));
	connectedDice.delete(diceId);
	Utils.saveDices();
	ui.dicebar.render(true);
};

GoDice.prototype.onRollStart = (diceId) => {
	if(rollTimer){
		clearTimeout(rollTimer);
		let bar = document.querySelectorAll("#round-time-bar");
		bar[0].classList.remove("round-time-bar");
	}
	let diceType = connectedDice.get(diceId).getDieType(true);
	let diceColor = connectedDice.get(diceId).getDieColor(true);
	console.log("Roll Start: ", diceType, diceColor);
};

GoDice.prototype.onStable = (diceId, value, xyzArray) => {
	console.log("Stable Roll:", diceId, value, xyzArray);
	Utils.showRoll(diceId, value, "Stable");
};

GoDice.prototype.onTiltStable = (diceId, value, xyzArray) => {
	console.log("TiltStable Roll:", diceId, value, xyzArray);
	Utils.showRoll(diceId, value, "TiltStable");
};

GoDice.prototype.onFakeStable = (diceId, value, xyzArray) => {
	console.log("FakeStable Roll:", diceId, value, xyzArray);
	Utils.showRoll(diceId, value, "FakeStable");
};

GoDice.prototype.onMoveStable = (diceId, value, xyzArray) => {
	console.log("MoveStable Roll:", diceId, value, xyzArray);
};