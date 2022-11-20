const connectedDice = new Map();
const rolledDice = new Map();

async function diceBarInit() {

	console.log("DiceBar | Initializing...");
	window.dicebar = new DiceBarPopulator();
	ui.dicebar = new DiceBar(window.dicebar);
	let obj = {
		enabled: true,
		left: 100,
		top: 100,
		width: 502,
		height: 52,
		scale: 1.0,
		log: true,
		renderContext: "dicebar",
		renderData: "init"
	};

	game.settings.register(MODULE_NAME, "DiceBarDisabled", {
		config: true,
		type: Boolean,
		default: false,
		name: game.i18n.localize('Disable DiceBar'),
		hint: game.i18n.localize('Disable Dice Bar'),
		onChange: value => {
			console.debug(`Is the DiceBar disabled? ${value}`)
		}
	});

	let diceDisplay = "flex";
	if (game.settings.get(MODULE_NAME, "DiceBarDisabled") === true) {
		console.debug('DiceBar | User disabled dice bar.');
		diceDisplay = "none";
	}

	let r = document.querySelector(':root');
	r.style.setProperty('--dicebar-display', diceDisplay);
	Utils.setDiceBarMaxSlots();

	ui.dicebar.render(true, obj);
}

class Utils {

	static openConnectionDialog() {
		const newDice = new GoDiceExt();
		newDice.requestDevice();
	}

	static saveDices() {
		let diceToStore = [];
		connectedDice.forEach(function(dieInstance, diceId) {
			diceToStore.push(diceId + "|" + dieInstance.getDieType(true));
		});
		sessionStorage.setItem('connectedDice', JSON.stringify(diceToStore));
	}

	static disconnectAll() {
		if (connectedDice) {
			connectedDice.forEach(function(diceInstance, diceId) {
				Utils.disconnectDice(diceId);
			});
		}
		else {
			console.log("No dice connected");
		}
	}

	static disconnectDice(diceId) {
		console.log("Disconnect:", diceId);
		connectedDice.get(diceId).onDisconnectButtonClick();
		connectedDice.delete(diceId);
		Utils.saveDices();
		Utils.delDieFromBar(diceId);
	}

	static getModulePath() {
		let paths = Array.from(document.getElementsByTagName('script')).filter((script) => { return script.src.includes('GoDice') })[0].src.split("/")
		let path = "/modules/" + paths[4] + "/";
		console.debug("Module path: ", path);
		return path;
	}

	static isManualRollActive() {
		let manualRollInstalled = game.modules.get("df-manual-rolls") ? true : false;
		let manualRollModuleActive = false;
		let manualRollActivated = false;
		try {
			if (manualRollInstalled)
				manualRollModuleActive = game.modules.get("df-manual-rolls").active;
			if (manualRollModuleActive) {
				let manualRollSetting = game.user.isGM ? game.settings.get("df-manual-rolls", "gm") : game.settings.get("df-manual-rolls", "pc");
				let manualRollToggle = game.settings.get("df-manual-rolls", "toggled");
				manualRollActivated = (manualRollSetting === 'always' || (manualRollSetting === 'toggle' && manualRollToggle));
			}
		} catch (err) {
			console.log("Module: df-manual-rolls not found. ", err);
		}
		return manualRollActivated;
	}

	static LoadStoredInfos() {
		let storedConnectedDice = sessionStorage.getItem('connectedDice');
		if (storedConnectedDice != null) {
			console.log("Wait... Reloading Stored dices...");
			let storedDice = JSON.parse(storedConnectedDice);
			storedDice.forEach(function(dieInfo, index) {
				console.debug("Retrieved info ", dieInfo);
				let dieId = dieInfo.split("|")[0];
				let dieType = dieInfo.split("|")[1];
				try {
					console.debug("Reconnecting device ", dieId, " of type ", dieType);
					let newDieInstance = new GoDiceExt();
					newDieInstance.reconnectDevice(dieId, dieType);
				} catch (err) {
					console.log("Exception Loading Stored Dice.", dieId, err);
				}
			});
		}
	}

	static htmlToElement(html) {
		var template = document.createElement('template');
		html = html.trim();
		template.innerHTML = html;
		return template.content.firstChild;
	}

	static findSpeaker(name) {
		var mySpeaker;
		var speakerTypeMessage;
		if (name) {
			var myToken = canvas.tokens.ownedTokens.find(t => t.name == name);
			var myScene = game.scenes.get(game.user.viewedScene);
			var myActor = game.actors.getName(name);
			if (myToken) {
				mySpeaker = ChatMessage.getSpeaker({ token: myToken });
				speakerTypeMessage = "[GoDice] Owned token with name " + name + " found, using for chat message."
			} else if (myScene && myActor) {
				mySpeaker = ChatMessage.getSpeaker({ scene: myScene, actor: myActor });
				speakerTypeMessage = "[GoDice] Actor with name " + name + " found, using for chat message."
			} else {
				mySpeaker = ChatMessage.getSpeaker({ user: game.user });
				mySpeaker.alias = event.name;
				speakerTypeMessage = "[GoDice] No token or actor with name " + name + " found, using player with alias for chat message."
			}
		}
		//If no name is given, get the user's default speaker.
		if (!mySpeaker) {
			mySpeaker = ChatMessage.getSpeaker({ user: game.user })
		}
		console.log("[GoDice] Received external dice roll with alias " + name + ".");
		console.log(speakerTypeMessage);
		return mySpeaker;
	}

	static showRoll(diceId, value, rollEvent) {
		let diceInstance = connectedDice.get(diceId);
		if (game)
			Utils.showRollVTT(diceId, value, rollEvent);
		else {
			let rollitem = document.getElementById('roll');
			if (!rollitem) {
				rollitem = document.createElement('div');
				rollitem.id = 'roll';
				document.getElementsByTagName('body')[0].append(rollitem);
			}
			rollitem.textContent = value;
			rollitem.style.border = 'solid';
			rollitem.style.borderColor = diceInstance.getDieColor(true);
		}
	}

	static async showRollVTT(diceId, value, rollEvent) {
		let dieType = connectedDice.get(diceId).getDieType(true);
		let dieColor = connectedDice.get(diceId).getDieColor(true);
		//let dieFaces = parseInt(dieType.replace("D", "").replace("X","0"));

		console.log(rollEvent + " event: ", dieType, dieColor, value);

		let flagAssigned = false;
		let flagAllAssigned = false;

		if (GoDiceRoll.isEnabled()) {
			let diceRollsPrompt = document.getElementByID("roll_prompt");
			if (!diceRollsPrompt || diceRollsPrompt.length == 0) {
				await Utils.rollSingleDie(dieType, value);
			}else{
				diceRolls = diceRollsPrompt.getElementById(dieType.toLowerCase());
				for(let r=0;r<diceRolls.length && !flagAssigned; r++)
				{
					if(!diceRolls[0].getElementByClassName("dice")[0].value)
					{
						diceRolls[0].getElementByClassName("dice")[0].value = value;
						flag_assigned = true;
					}
				}
			}
		}
		else {
			await Utils.rollSingleDie(dieType, value)
		}
	}
	
	static async rollSingleDie(dieType, value)
	{	
		let r = new Roll("1" + dieType);
		r.isSingleRoll = true;
		await r.evaluate({ async: true });
		try {
			r.terms[0].results[0].result = value;
			r._total = value;
			r.toMessage();
		}
		catch (err) {
			console.log("Exp:", err);
		}
	}

	static async addDieToBar(diceId) {
		let dieBar = ui.dicebar;
		let die = connectedDice.get(diceId);

		if (dieBar) {
			await dieBar.assignDiceBarDice(die, null);
		}
	}

	static async delDieFromBar(diceId) {

		let dieBar = ui.dicebar;
		let bar = ui.dicebar.dice.filter(d => { return d.diceId === diceId });

		if (bar && bar.length > 0) {
			let slot = bar[0].slot;
			await dieBar.assignDiceBarDice(null, slot);
		}
	}

	static setDiceBarMaxSlots() {
		let r = document.querySelector(':root');
		r.style.setProperty('--dicebar-slots', parseInt(connectedDice.size) + 1);
	}
}