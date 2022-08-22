const connectedDice = new Map();
const modulePath = "modules/GoDiceModule/";

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
	let diceType = null;
	if(diceInstance.newConnection)
	{	
		//Show popup to select the dice Type
		//diceType = prompt("Select the dice Type","D6");
        let data =[];
		for (const typeKey of Object.keys(GoDice.diceTypes)) {
            data.push({
                id: GoDice.diceTypes[typeKey],
                type: typeKey
            });
        }
        let args = {};
        args["label"] = game.i18n.localize("GODICE_ROLLS.Prompt.Header_DiceType");
        args["diceTypes"] = data;
        args["path"] = modulePath+"/images";
        args["diceColor"] = diceInstance.getDiceColorString();
        let template = await renderTemplate(modulePath+"templates/diceType-prompt.hbs", args);
		await Dialog.prompt({
				title: game.i18n.localize("GODICE_ROLLS.Prompt.DefaultTitle"),
				content: template,
				icon: `<i class="fas fa-check"></i>`,				
				label: game.i18n.localize("GODICE_ROLLS.Submit"),
				callback: async(html) => {
					console.log(document.getElementById('diceTypes'));
					diceType = getSelectedDice();
				},
				options: { 
					height:'140px'
				}
		});
		if(diceType)
		{
			diceInstance.setDieType(GoDice.diceTypes[diceType]);
			console.log("Selected Dice Type:", diceType);
		}
		else
			console.log("Error retrieving Dice Type");
	}

	return diceType;
}

function getSelectedDice()
{
	let selectedValue = null;
	let selectElement = document.getElementById('diceTypes');
	if(selectElement)
	{
		let selectedIndex = selectElement.selectedIndex;
		selectedValue = selectElement[selectedIndex].id;
	}
	else
	{
		console.log("No diceTypes element found");
	}
	return selectedValue;
}

function changeImageDice()
{
	let selectedDice = getSelectedDice();
	if(selectedDice)
	{
		let imgEl = document.getElementById('diceTypeIcon');
		imgEl.src=modulePath+"/images/"+selectedDice+".webp";
	}
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
	let diceInstance = connectedDice.get(diceId);
	let diceType = diceInstance.getDiceTypeString();	
	let diceColor = diceInstance.getDiceColorString();
	let diceFaces = parseInt(diceType.replace("D", "").replace("X","0"));
	
	console.log(rollEvent + " event: ", diceType, diceColor, diceId, value);
	
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
		}
		catch (err)
		{ 
			console.log("Exp:", err);
		}
        let chatOptions = {
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			rolls: [r],
			rollMode: game.settings.get("core", "rollMode"),
			content: "<div style=\"color:"+diceColor+"\">GoDice Roll 1"+diceType+"</div>"
		};
		ChatMessage.create(chatOptions);
	}
}

function isManualRollActive()
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
		if(!diceInstance.newConnection || selectDiceType(diceInstance))
		{
			connectedDice.set(diceId, diceInstance);
			saveDices();
			console.log("Dice connected: ", diceId, diceInstance.getDiceTypeString(), diceInstance.getDiceColorString());
		}else{
			console.log("Error connecting dice");
			diceInstance.onDisconnectButtonClick();
			connectedDice.delete(diceId);
			saveDices();
		}
	}
};

GoDice.prototype.onRollStart = (diceId) => {
	let diceType = connectedDice.get(diceId).getDiceTypeString();	
	let diceColor = connectedDice.get(diceId).getDiceColorString();
	console.log("Roll Start: ", diceType, diceColor, diceId);
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
