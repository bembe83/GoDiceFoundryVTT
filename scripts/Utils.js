class Utils {

	static openConnectionDialog() {
		const newDice = new GoDiceExt();
		newDice.requestDevice();
	}

	static saveDices(connectedDice) {
		let diceToStore = [];
		connectedDice.foreach(function(dieInstance, diceId) {
			diceToStore.push(diceId+"|"+dieInstance,getDieType(true));
		});
		sessionStorage.setItem('connectedDice', JSON.stringify(diceToStore));
	}

	static disconnectAll(connectedDice) {
		if(connectedDice)
		{
			connectedDice.forEach(function(diceInstance, diceId) {
				Utils.disconnectDice(connectedDice, diceId);
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
		Utils.saveDices(connectedDice);
	}

	static getModulePath()
	{
		let paths = Array.from(document.getElementsByTagName('script')).filter((script)=>{return script.src.includes('GoDice')})[0].src.split("/")
		let path = "/modules/"+paths[4]+"/";
		console.debug("Module path: ",path);
		return path;
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
			let storedDice = JSON.parse(storedConnectedDice);	
			storedDice.forEach(function(dieInfo, index) {
				console.debug("Retrieved info ", dieInfo);
				let dieId = dieInfo.split("|")[0];
				let dietype = dieinfo.split("|")[1];
				console.debug("Reconnecting device ", dieId, " of type ", dieType);
				let newDieInstance = new GoDiceExt();
				newDieInstance.reconnectDevice(dieId, dieType);
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
			Utils.showRollVTT(diceInstance, diceId, value, rollEvent);
		else{
			let rollitem = document.getElementById('roll');
			if(!rollitem)
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
		let dieType = diceInstance.getDieType(true);	
		let dieColor = diceInstance.getDieColor(true);
		let dieFaces = parseInt(dieType.replace("D", "").replace("X","0"));
		
		console.log(rollEvent + " event: ", dieType, dieColor, value);
		
		let flagAssigned = false;
		let flagAllAssigned = false;
		let id = 0;

		if(Utils.isManualRollActive())
		{
			let diceRolls = document.querySelectorAll("[name^='"+id+"-']");
			if(!diceRolls || diceRolls.length == 0)
			{
				let r = new Roll("1"+dieType);
				r.evaluate({ async: true });
				diceRolls = document.querySelectorAll("[name^='"+id+"-']");
			}

			while (!flagAssigned || !flagAllAssigned || !diceRolls || diceRolls.length == 0)
			{
				let dieRollTR = document.querySelectorAll("[name^='"+id+"-0']")[0].parentElement;
				let dieLabel = dieRollTR.previousElementSibling?dieRollTR.previousElementSibling:null;
				if(dieLabel && dieLabel.textContent.includes(dieType.toLowerCase()))
				{
					for (let i=0; i<diceRolls.length && !flagAssigned; i++)		
					{
						let dieRoll = diceRolls[i];
						if(dieRoll.value == '' && !dieRoll.name.includes('total'))
						{
							dieRoll.value = value;
							dieRoll.style.color = dieColor;
							flagAssigned = true;
						}
						if(flagAssigned && i == diceRolls.length-1)
						{
							let button = document.getElementsByName("submit")[0];
							flagAllAssigned = true;
							button.click();
						}
					}
				}
				id++;
				diceRolls = document.querySelectorAll("[name^='"+id+"-']");
			}
		}
		else
		{
			let r = new Roll("1"+dieType);
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