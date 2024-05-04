import { GoDiceExt, rolledDice, disconnectedDice, connectedDice, reloadedDice } from "./GoDiceExt.mjs";
import { GoDiceRoll, advdis_modifier, godiceroll_modifier, ROLLED_TIMEOUT } from "./GoDiceRoll.mjs";

export var rollTimer;
export const MODULE_NAME = "go-dice-module";

export const  facesToImages = {
            4: "modules/"+MODULE_NAME+"/images/d4.webp",
            6: "modules/"+MODULE_NAME+"/images/d6.webp",
            8: "modules/"+MODULE_NAME+"/images/d8.webp",
            10: "modules/"+MODULE_NAME+"/images/d10.webp",
            12: "modules/"+MODULE_NAME+"/images/d12.webp",
            20: "modules/"+MODULE_NAME+"/images/d20.webp",
            100: "modules/"+MODULE_NAME+"/images/d10.webp",
}

export const  facesToIcon= {
            4: "modules/"+MODULE_NAME+"/images/d4_icon.webp",
            6: "modules/"+MODULE_NAME+"/images/d6_icon.webp",
            8: "modules/"+MODULE_NAME+"/images/d8_icon.webp",
            10: "modules/"+MODULE_NAME+"/images/d10_icon.webp",
            12: "modules/"+MODULE_NAME+"/images/d12_icon.webp",
            20: "modules/"+MODULE_NAME+"/images/d20_icon.webp",
            100: "modules/"+MODULE_NAME+"/images/d10_icon.webp",
}

export class Utils {

	static openConnectionDialog() {
		const newDice = new GoDiceExt();
		newDice.requestDevice();
	}

	static saveDices() {
		let diceToStore = [];
		connectedDice.forEach(function(dieInstance, diceId) {
			diceToStore.push(diceId + "|" + dieInstance.getDieType(true) + "|" + dieInstance.getDiceColor(true));
		});
		Utils.setCookie('connectedDice', JSON.stringify(diceToStore), 2);
	}
	
	static LoadStoredInfos() {
		let storedConnectedDice = Utils.getCookie('connectedDice');
		if (storedConnectedDice) {
			console.log("Wait... Reloading Stored dices...");
			let storedDice = JSON.parse(storedConnectedDice);
			storedDice.forEach(function(dieInfo) {
				console.debug("Retrieved info ", dieInfo);
				let dieId = dieInfo.split("|")[0];
				let dieType = dieInfo.split("|")[1];
				let diecolor = dieInfo.split("|")[2];
				try {
					console.debug("Setting device ", dieId, " of type ", dieType," to be reconnected");
					let newDieInstance = new GoDiceExt();
					newDieInstance.diceId = dieId;
					newDieInstance.setDieType(dieType);
					//newDieInstance.setDieColor();
					newDieInstance.setBatteryLevel();
					reloadedDice.set(dieId, newDieInstance);
					//newDieInstance.reconnectDevice(dieId, dieType).catch((error)=>{console.log(error)});
				} catch (err) {
					console.log("Exception Loading Stored Dice.", dieId, err);
				}
			})
			console.debug(reloadedDice);
		}
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
		connectedDice.get(diceId).reconnect = false;
		connectedDice.get(diceId).onDisconnectButtonClick();
	}
	
	static reconnectDice(){
		if(disconnectedDice) {
			disconnectedDice.forEach(function(dieInstance, dieId) {
				try {
					console.debug("Reconnecting device ", dieId);
					dieInstance.reconnectDevice(dieId, dieInstance.getDieType(true));
					
				} catch (err) {
					console.log("Exception Reconnecting Die.", dieId, err);
					disconnectedDice.delete(dieId);
				}
			});
		}
	}
	
	static reconnectLoadedDice(){
		if(reloadedDice) {
			reloadedDice.forEach(function(dieInstance, dieId) {
				try {
					console.debug("Reconnecting device ", dieId);
					dieInstance.reconnectLoadedDevice(dieId, dieInstance.getDieType(true));
				} catch (err) {
					console.log("Exception Reconnecting Die.", dieId, err);
					reloadedDice.delete(dieId);
				}
			});
		}
	}

	static getModulePath() {
		let id = game.modules.filter(module => {return module.title.includes("GoDice")})[0].id;
		let path = "/modules/" + id + "/";
		console.debug("Module path: ", path);
		return path;
	}

	static disableManualRollModule() {
		let manualRollInstalled = game.modules.get("df-manual-rolls") ? true : false;
		let manualRollModuleActive = false;
		try {
			if (manualRollInstalled)
				manualRollModuleActive = game.modules.get("df-manual-rolls").active;
			if (manualRollModuleActive) {
				game.module.set("df-manual-rolls").active = false;
				location.reload();
			}
		} catch (err) {
			console.log("Module: df-manual-rolls not found. ", err);
		}
		return;
	}
	
	static unfulfilledRollsEnabled(){
		return game.modules.get("unfulfilled-rolls") ? true : false;
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
				speakerTypeMessage = "[GoDiceRoll] Owned token with name " + name + " found, using for chat message."
			} else if (myScene && myActor) {
				mySpeaker = ChatMessage.getSpeaker({ scene: myScene, actor: myActor });
				speakerTypeMessage = "[GoDiceRoll] Actor with name " + name + " found, using for chat message."
			} else {
				mySpeaker = ChatMessage.getSpeaker({ user: game.user });
				mySpeaker.alias = event.name;
				speakerTypeMessage = "[GoDiceRoll] No token or actor with name " + name + " found, using player with alias for chat message."
			}
		}else{
			mySpeaker = ChatMessage.getSpeaker({ actor: canvas.tokens.controlled[0].name });
			mySpeaker.alias = canvas.tokens.controlled[0].name;
			name = mySpeaker.alias 
			speakerTypeMessage = "[GoDiceRoll] Selected token with name " + name + " found, using for chat message."
		}
		console.log("[GoDiceRoll] Received dice roll with alias " + name + ".");
		console.log(speakerTypeMessage);
		return mySpeaker;
	}

	static showRoll(diceId, value, rollEvent) {
		let diceInstance = connectedDice.get(diceId);
		if (game)
			Utils.handleRoll(diceId, value, rollEvent);
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

	static handleRoll(diceId, value, rollEvent) {
	
		let dieType  = connectedDice.get(diceId).getDieType(true);
		let dieColor = connectedDice.get(diceId).getDieColor(true);
		let dieFaces = connectedDice.get(diceId).getDieFaces();
		console.log(rollEvent + " event: ", dieType, dieColor, value);
		
		if(value === 1)
			connectedDice.get(diceId).pulseLed(5, 30, 20, [255, 0, 0]);
		if(value === dieFaces)
			connectedDice.get(diceId).pulseLed(5, 30, 20, [0, 255, 0]);
		
		let diceRollsPrompt = document.querySelectorAll('#roll_prompt');
		if (GoDiceRoll.isEnabled() && diceRollsPrompt && diceRollsPrompt.length > 0){
			Utils.populateRollPrompt(diceRollsPrompt, dieType, value);
		}	else{
			Utils.startTimeout(dieType, dieFaces, value);
		}
	}
	
	static populateRollPrompt(diceRollsPrompt, dieType, value) {
				
		let diceRolls = diceRollsPrompt[0].querySelectorAll('input[name^="'+dieType.toLowerCase()+'"]')
		if(!diceRolls || diceRolls.length == 0)	{
			console.log("No roll required for the type "+dieType.toLowerCase());
			return;
		}
		let flagAssigned = false;
		for(let r=0;r<diceRolls.length && !flagAssigned; r++) {
			if(!diceRolls[r]?.value)
			{
				diceRolls[r].value = parseInt(value);
				Utils.rollFieldUpdate(diceRolls[r]);	
				flagAssigned = true;
			}
		}
	}
	
	static rollFieldUpdate(dieField){
		console.debug(dieField);
		let diceRollsPrompt = document.querySelectorAll('#roll_prompt');
		let remainRolls = parseInt(diceRollsPrompt[0].getAttribute("data-counter"));
		
		dieField.setAttribute('readonly', true);
		dieField.parentElement.classList.add("fulfilled")
		
		remainRolls--;
		diceRollsPrompt[0].setAttribute("data-counter", remainRolls);
		
		Utils.sendRolls(diceRollsPrompt);
	}
	
	static sendRolls(diceRollsPrompt){
		let remainRolls = parseInt(diceRollsPrompt[0].getAttribute("data-counter"));	
		if(remainRolls<=0 && GoDiceRoll.isAutoSendEnabled()) {
			document.getElementById("roll_submit").click();
		}	
	}
	
	static startTimeout(dieType, dieFaces, value) {		
		let die = rolledDice.get(dieType);
		if(die){
			die.number = die.number + 1;
		}else{
			if(advdis_modifier.length>0)
				die = new Die({number:1, faces:dieFaces, modifiers:[advdis_modifier]});	
			else
				die = new Die({number:1, faces:dieFaces});
		}
		if(parseInt(value) < 0)
			value = 1;
		die.results.push({result:parseInt(value), active:true});
		rolledDice.set(dieType,die);
		
		let bar = document.querySelectorAll("#round-time-bar");
		bar[0].classList.remove("round-time-bar");
		bar[0].offsetWidth;
		bar[0].classList.add("round-time-bar");
		rollTimer = setTimeout(Utils.rollDice, ROLLED_TIMEOUT);
	}
	
	static rollDice() {	
		let plus = new OperatorTerm({operator: "+"});
		let terms=[];
		
		plus._evaluated = true;
		rolledDice.forEach((die, diceId) => {
			console.debug("Evaluate terms for ", diceId, " dice");
			die._evaluateModifiers();
			die._evaluated = true;
			if(terms.length>0)
				terms.push(plus);
			terms.push(die);
		});
		if(terms.length > 0) {
			let termMod = new NumericTerm({number:godiceroll_modifier});
			termMod._evaluated = true;
			if(godiceroll_modifier>0)
			{
				terms.push(plus);
				terms.push(termMod);
			}else if(godiceroll_modifier<0){
				terms.push(termMod);
			}
			
			let r = Roll.fromTerms(terms);
			r.toMessage({flavor:"<b style =\"font-size:1.5em\">GoDiceRoll</b>"});
		}
		rolledDice.clear();
	}

	static setDiceBarMaxSlots() {
		let r = document.querySelector(':root');
		r.style.setProperty('--dicebar-slots', parseInt(connectedDice.size) + 1);
	}
	
	static setCookie(cname, cvalue, exdays) {
		 const d = new Date();
		 d.setTime(d.getTime() + (exdays*24*60*60*1000));
		 let expires = "expires="+ d.toUTCString();
		 document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
	}
	
	static getCookie(name) {
	    var cname = name + "=";
	    var decodedCookie = decodeURIComponent(document.cookie);
	    var ca = decodedCookie.split(';');
	    for(var i = 0; i < ca.length; i++){
	        var c = ca[i];
	        while(c.charAt(0) == ' '){
	            c = c.substring(1);
	        }
	        if(c.indexOf(cname) == 0){
	            return c.substring(cname.length, c.length);
	        }
	    }
	    return "";
	}
}