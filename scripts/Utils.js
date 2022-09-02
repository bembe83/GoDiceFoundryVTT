class Utils {

	static openConnectionDialog() {
		const newDice = new GoDiceExt();
		newDice.requestDevice();
	}

	static saveDices(connectedDice) {
		sessionStorage.setItem('connectedDice', JSON.stringify(Array.from(connectedDice.keys())));
	}

	static disconnectAll(connectedDice) {
		if(connectedDice)
		{
			connectedDice.forEach(function(diceInstance, diceId) {
				disconnectDice(connectedDice, diceId);
			});
		}
		else
		{
			console.log("No dice connected");
		}
	}

	static disconnectDice(connectedDice, diceId) {
		console.log("Disconnect:", diceId);
		connectedDice.get(diceId).onDisconnectButtonClick();
		connectedDice.delete(diceId);
		saveDices(connectedDice);
	}

	static isManualRollActive()
	{
		let manualRollInstalled = game.modules.get("df-manual-rolls")?true:false;
		let manualRollModuleActive = false;
		let manualRollActivated = false;
		try{
			if(manualRollInstalled)
				manualRollModuleActive = game.modules.get("df-manual-rolls").active;
			if(manualRollModuleActive)
			{
				let manualRollSetting = game.user.isGM?game.settings.get("df-manual-rolls","gm"):game.settings.get("df-manual-rolls","pc");
				let manualRollToggle = game.settings.get("df-manual-rolls","toggled");
				manualRollActivated = (manualRollSetting === 'always' || (manualRollSetting === 'toggle' && manualRollToggle));
			}
		} catch (err)
		{
			console.log("Module: df-manual-rolls not found. ", err);
		}
		return manualRollActivated;
	}

	static LoadStoredInfos()
	{
		let storedConnectedDice = sessionStorage.getItem('connectedDice');
		if(storedConnectedDice != null)
		{
			console.log("Wait... Reloading Stored dices...");
			let storedDices = JSON.parse(storedConnectedDice);	
			storedDices.forEach(function(diceId, index) {
				let newDiceInstance = new GoDiceExt(diceId);
				newDiceInstance.reconnectDevice();
			});
		}
	}

	static htmlToElement(html) {
	    var template = document.createElement('template');
	    html = html.trim(); // Never return a text node of whitespace as the result
	    template.innerHTML = html;
	    return template.content.firstChild;
	}

	static findSpeaker(name) {
	    //If a character name was given, try to find a speaker with that name in this scene.
	    //Try to find one among the owned tokens first, then all actors.
	    //If neither are found, get the user's default speaker and change its alias to the name.
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

	static showRoll(diceInstance, diceId, value, rollEvent) {
		if(game)
			showRollVTT(diceInstance, diceId, value, rollEvent);
		else{
			let rollitem = document.getElementById('roll');
			if(rollitem)
			{
				rollitem = document.createElement('div');
				rollitem.id ='roll';
				document.getElementsByTagName('body')[0].append(rollitem);
			}
			rollitem.textContent = value;
			rollitem.style.border =	'solid';
			rollitem.style.borderColor = diceInstance.getDieColor(true);
		}
	}

	static async showRollVTT(diceInstance, diceId, value, rollEvent) {
		let diceType = diceInstance.getDieType(true);	
		let diceColor = diceInstance.getDieColor(true);
		let diceFaces = parseInt(diceType.replace("D", "").replace("X","0"));
		
		console.log(rollEvent + " event: ", diceType, diceColor, value);
		
		let flagAssigned = false;
		let id = 0;

		if(isManualRollActive())
		{
			let diceRolls = document.querySelectorAll("[name^='"+id+"-']");
			if(!diceRolls)
			{
				let r = new Roll("1"+diceType);
				r.evaluate({ async: true });
				diceRolls = document.querySelectorAll("[name^='"+id+"-']");
			}

			while (!flagAssigned || diceRolls)
			{
				if(!diceRolls[0].parentElement.previousElementSibling.textContent.includes(diceType.toLowerCase()))
				{
					for (let i=0; i<diceRolls.length && !flagAssigned; i++)		
					{
						let diceRoll = diceRolls[i];
						if(diceRoll.value == '' && !diceRoll.name.includes('total'))
						{
							diceRoll.value = value;
							diceRoll.style.color = colorString;
							flagAssigned = true;
						}
					}
				}
				id++;
				diceRolls = document.querySelectorAll("[name^='"+id+"-']");
			}
		}
		else
		{
			let r = new Roll("1"+diceType);
			await r.evaluate({ async: true });
	        try {
		    	r.terms[0].results[0].result = value;
		    	r._total = value;
		    	r.toMessage();
			}
			catch (err)
			{ 
				console.log("Exp:", err);
			}
		}
	}
}