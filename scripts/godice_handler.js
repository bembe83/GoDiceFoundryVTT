const connectedDice = new Map();

Hooks.on('getSceneControlButtons', (controls) => {
	controls.find(c => c.name == "token")
	.tools.push({
		name: 'connect',
		title:  game.i18n.localize('Connect'),
		icon: 'fas fa-dice',
		onClick: () => {  console.log("Dice Manager Clicked"); openConnectionDialog();},
		button: true
	});
	controls.find(c => c.name == "token")
	.tools.push({
		name: 'disconnect',
		title:  game.i18n.localize('Disconnect all dices'),
		icon: 'fas fa-trash',
		onClick: () => {  console.log("Disconnecting all dices"); disconnectAll();},
		button: true
	});
});

Hooks.on('ready', LoadStoredInfos());

function LoadStoredInfos()
{
	let storedConnectedDice = sessionStorage.getItem('connectedDice');
	if(storedConnectedDice != null)
	{
		console.log("Wait... Reloading Stored dices...");
		let storedDices = JSON.parse(storedConnectedDice);	
		storedDices.forEach(function(diceId, index) {
			let newDiceInstance = new GoDice(diceId);
			newDiceInstance.reconnectDevice();
		});
	}
}

// Open the Bluetooth connection dialog for choosing a GoDice to connect
function openConnectionDialog() {
	const newDice = new GoDice();
	newDice.requestDevice();
}

async function selectDiceType(diceInstance)
{
	let diceType = "";
	if(diceInstance.newConnection)
	{	
		//Show popup to select the dice Type
		//diceType = prompt("Select the dice Type","D6");
		let diceType = "";
        let data =[];
		for (const typeKey of Object.keys(GoDice.diceTypes)) {
            data.push({
                id: GoDice.diceTypes[typeKey],
                type: typeKey
            });
        }
        let template = await renderTemplate("modules/GoDiceModule/templates/diceType-prompt.hbs",{diceTypes: data});
		await Dialog.prompt({
				title: game.i18n.localize("GODICE_ROLLS.Prompt.DefaultTitle"),
				content: template,
				icon: `<i class="fas fa-check"></i>`,				
				label: game.i18n.localize("GODICE_ROLLS.Submit"),
				callback: async(html) => {
					console.log(html[0].querySelector('diceTypes'));
					let selectedType = html[0].querySelector('#diceTypes').options[html[0].querySelector('#diceTypes').selectedIndex].value;
					diceType = selectedType;
				}
		});
		diceInstance.setDieType(GoDice.diceTypes[diceType]);
	}

	return;
}

function addConnectedDice(diceId, diceInstance)
{
	let diceType = diceInstance.getDiceTypeString();	
	let diceColor = diceInstance.getDiceColorString();
	
	let hotbar = document.getElementById('hotbar');
}

function saveDices(){
	sessionStorage.setItem('connectedDice', JSON.stringify(Array.from(connectedDice.keys())));
}

function disconnectAll()
{
	if(connectedDice)
	{
		connectedDice.forEach(function(diceInstance, diceId) {
			disconnectDice(diceId);
		});
	}
	else
	{
		console.log("No dice connected");
	}
}

function disconnectDice(diceId)
{
	console.log("Disconnect:", diceId);
	connectedDice.get(diceId).onDisconnectButtonClick();
	connectedDice.delete(diceId);
	saveDices();
}

async function addRoll(diceId, value, rollEvent)
{
	let manualRollInstalled = game.modules.get("df-manual-rolls")?true:false;
	let manualRollActive = false;
	try{
		manualRollActive = game.modules.get("df-manual-rolls").active;
	} catch (err)
	{
		console.log("Module: df-manual-rolls not found. ", err);
	}
	let diceType = diceInstance.getDiceTypeString();	
	let diceColor = diceInstance.getDiceColorString();
	let diceFaces = parseInt(diceType.replace("D", "").replace("X","0"));
	
	console.log(rollEvent + " event: ", diceType, colorString, diceId, value);
	
	let flagAssigned = false;
	let id = 0;

	if(manualRollActive)
	{
		let diceRolls = document.querySelectorAll("[name^='"+id+"-']");
		if(!diceRolls)
		{
			let r = new Roll("1"+diceType);
			await r.evaluate({ async: true });
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
        //Try to overwrite each attribute, starting with the terms; getters will be caught and ignored.
        try {
	    	r.terms[0].results[0].result = value;
	    	r._total = value;
		}
		catch (err)
		{ 
			console.log("Exp:", err);
		}
        r.toMessage({
        	speaker: findSpeaker()
        });
	}

	
}

function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function findSpeaker(name) {
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
            speakerTypeMessage = "[External Dice Roll Connector] Owned token with name " + name + " found, using for chat message."
        } else if (myScene && myActor) {
            mySpeaker = ChatMessage.getSpeaker({ scene: myScene, actor: myActor });
            speakerTypeMessage = "[External Dice Roll Connector] Actor with name " + name + " found, using for chat message."
        } else {
            mySpeaker = ChatMessage.getSpeaker({ user: game.user });
            mySpeaker.alias = event.name;
            speakerTypeMessage = "[External Dice Roll Connector] No token or actor with name " + name + " found, using player with alias for chat message."
        }
    }
    //If no name is given, get the user's default speaker.
    if (!mySpeaker) {
        mySpeaker = ChatMessage.getSpeaker({ user: game.user })
    }
    console.log("[External Dice Roll Connector] Received external dice roll with alias " + name + ".");
    console.log(speakerTypeMessage);
    return mySpeaker;
}

GoDice.prototype.onDiceConnected = (diceId, diceInstance) => {

	if(connectedDice.get(diceId))
	{
		console.log('Dice already connected');
	}
	else
	{
		console.log("Connecting Dice: ", diceId);
		selectDiceType(diceInstance);
		connectedDice.set(diceId, diceInstance);
		saveDices();
		console.log("Dice connected: ", diceId, diceInstance.getDiceTypeString(), diceInstance.getDiceColorString());
	}
};

GoDice.prototype.onRollStart = (diceId) => {
	let diceType = connectedDice.get(diceId).getDiceTypeString();	
	let diceColor = connectedDice.get(diceId).getDiceColorString();
	console.log("Roll Start: ", diceType, colorString, diceId);
};

GoDice.prototype.onStable = (diceId, value, xyzArray) => {
	addRoll(diceId, value, "Stable");
};

GoDice.prototype.onTiltStable = (diceId, xyzArray, value) => {
	addRoll(diceId, value, "TiltStable");
};

GoDice.prototype.onFakeStable = (diceId, value, xyzArray) => {
	addRoll(diceId, value, "FakeStable");
};

GoDice.prototype.onMoveStable = (diceId, value, xyzArray) => {
	addRoll(diceId, value, "MoveStable");
};

GoDice.prototype.onBatteryLevel = (diceId, batteryLevel) => {
	console.log("BetteryLevel: ", diceId, batteryLevel);
	// get dice battery indicator element
	//const batteryLevelEl = document.getElementById(diceId + "-battery-indicator");
	connectedDice.get(diceId).batteryLevel = batteryLevel;
	saveDices();
};
