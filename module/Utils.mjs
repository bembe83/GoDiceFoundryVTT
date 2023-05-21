import { GoDiceExt, rolledDice, disconnectedDice, connectedDice } from "./GoDiceExt.mjs";
import { GoDiceRoll, advdis_modifier, godiceroll_modifier, ROLLED_TIMEOUT } from "./GoDiceRoll.mjs";

export var rollTimer;
export const MODULE_NAME = "go-dice-module";

export class Utils {

	static openConnectionDialog() {
		const newDice = new GoDiceExt();
		newDice.requestDevice();
	}

	static saveDices() {
		let diceToStore = [];
		connectedDice.forEach(function(dieInstance, diceId) {
			diceToStore.push(diceId + "|" + dieInstance.getDieType(true));
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
				try {
					console.debug("Setting device ", dieId, " of type ", dieType," to be reconnected");
					let newDieInstance = new GoDiceExt();
					newDieInstance.diceId = dieId;
					newDieInstance.setDieType(dieType);
					//newDieInstance.setDieColor();
					newDieInstance.setBatteryLevel();
					disconnectedDice.set(dieId, newDieInstance);
					//newDieInstance.reconnectDevice(dieId, dieType).catch((error)=>{console.log(error)});
				} catch (err) {
					console.log("Exception Loading Stored Dice.", dieId, err);
				}
			})
			console.debug(disconnectedDice);
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
		}
		else {
			Utils.startTimeout(dieType, dieFaces, value);
		}
	}
	
	static populateRollPrompt(diceRollsPrompt, dieType, value) {
				
		let diceRolls = diceRollsPrompt[0].querySelectorAll('.'+dieType.toLowerCase());
		if(!diceRolls || diceRolls.length == 0)	{
			console.log("No roll required for the type "+dieType.toLowerCase());
			return;
		}
		let flagAssigned = false;
		for(let r=0;r<diceRolls.length && !flagAssigned; r++) {
			if(!diceRolls[r]?.querySelectorAll('.dice')[0].value)
			{
				let dieField = diceRolls[r].querySelectorAll('.dice')[0];		
				flagAssigned = true;
				dieField.value = parseInt(value);
			}
		}
		let remaining = Array.from(document.querySelectorAll("#roll_prompt")[0].querySelectorAll(".dice")).filter(dice => { return !dice.value});
		if(remaining.length == 0 && GoDiceRoll.isAutoSendEnabled())
			document.getElementById("roll_submit").click();
	}
	
	static rollFieldUpdate(diceRolls){
		console.debug(this);
		let diceRollsPrompt = document.querySelectorAll('#roll_prompt');
		let remainRolls = parseInt(diceRollsPrompt[0].getAttribute("data-counter"));
		let dieField = diceRolls[r].querySelectorAll('.dice')[0];
		let dieValue  = document.createElement('input');
		
		dieField.setAttribute('readonly', true);
		dieValue.type = 'hidden';
		dieValue.name = dieField.name;
		dieValue.value = parseInt(value);
		dieField.insertAdjacentElement('afterend',dieValue);
		
		remainRolls--;
		diceRollsPrompt[0].setAttribute("data-counter", remainRolls);
		
		sendRolls(diceRollsPrompt);
	}
	
	static sendRolls(diceRollsPrompt){
		let remainRolls = parseInt(diceRollsPrompt[0].getAttribute("data-counter"));	
		if(remainRolls<=0) {
			diceRollsPrompt[0].getElementByTagName("button")[0].click();
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
/*	
	static async rollSingleDie(dieType, value) {	
		let modif = (godiceroll_modifier>0?("+"+godiceroll_modifier.toString()):(godiceroll_modifier.toString()));
		let r = new Roll("1" + dieType + modif);
		r.isSingleRoll = true;
		await r.evaluate({ async: true });
		try {
			r.terms[0].results[0].result = value;
			r._total = r._evaluateTotal();
			r.toMessage({speaker: Utils.findSpeaker(), flavor:"<b style =\"font-size:1.5em\">GoDiceRoll</b>"});
		}
		catch (err) {
			console.log("Exp:", err);
		}
	}
*/
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
			//r.isSingleRoll = true;
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
	
	static handleRemoteRoll(event){
		switch (event.type) {
			case "sessionId" :{
				ack({ sessionId : game.sessionId });
			}
            case "roll": {
                try {
                    //Check if this is a formula (string) or a Roll (object).
                    //A Roll will be converted into a real Roll object based on its formula, and then overwritten with the included data where possible.
                    if (event.roll instanceof Object) {
                        //Catch rolls that use "formula" or "total" as values instead of "_formula" and "_total".
                        if (event.roll.formula) {
                            event.roll._formula = event.roll.formula
                        }
                        if (event.roll.total) {
                            event.roll._total = event.roll.total;
                        }
                        var r = new Roll(event.roll._formula);
                        (async () => {
							r.isSingleRoll = event.roll.terms?true:false;
                            await r.evaluate({ async: true });
                            //Try to overwrite each attribute, starting with the terms; getters will be caught and ignored.
                            event.roll.terms?.forEach((term, index) => {
                                try {
                                    if (term instanceof Object && r.terms[index] instanceof Object) {
                                        event.roll.terms[index] = Object.assign(r.terms[index], term);
                                    } else {
                                        r.terms[index] = term;
                                    }
                                } catch { }
                            })
                            Object.keys(event.roll).forEach(key => {
                                try {
                                    if (r[key] instanceof Object) {
                                        r[key] = Object.assign(r[key], event.roll[key]);
                                    } else {
                                        r[key] = event.roll[key];
                                    }
                                } catch { }
                            })
                            const mySpeaker = Utils.findSpeaker(event);
                            //Finally, post the finished Roll into the chat.
                            r.toMessage({
                                speaker: mySpeaker
                            })
                        })();
                    } else {
                        var r = new Roll(event.roll.toString());
                        r.isSingleRoll = false;
                        (async () => {
                            await r.evaluate({ async: true });
                            const mySpeaker = Utils.findSpeaker(event);
                            //Finally, post the finished Roll into the chat.
                            r.toMessage({
                                speaker: mySpeaker
                            })
                        })();
                    }
                } catch (error) {
                    ui.notifications.error("[GoDiceRoll] Error: " + error.toString());
                }
                break;
            }
        }
	}
}