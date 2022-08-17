const connectedDice = {};

function LoadStoredInfos(event)
{
	let storedConnectedDice = sessionStorage.getItem('connectedDice');
	if(storedConnectedDice != null)
	{
		document.getElementById("placeholder").textContent= 'Wait... Reloading Stored dices...'
		storedConnectedDice = JSON.parse(storedConnectedDice);	
		Object.values(storedConnectedDice).forEach( function(diceInstance, diceId) {
			newDiceInstance = new GoDice(diceInstance);
			newDiceInstance.reconnectDevice();
		});
	}
	let storedPlayerName = sessionStorage.getItem('playerName');
	document.getElementById('player_name').value = storedPlayerName;
}

// if (window.addEventListener) { // Mozilla, Netscape, Firefox
    // window.addEventListener('load', LoadStoredInfos, false);
// } else if (window.attachEvent) { // IE
    // window.attachEvent('onload', LoadStoredInfos);
// }

/**
 * Get a new dice element or it's instance if it already exists
 * @param {string} diceID - the die unique identifier	 
 */
function getDiceHtmlEl(diceID) {
	if (!document.getElementById(diceID)) {
		const newDiceEl = document.createElement("div");
		newDiceEl.id = diceID;
		newDiceEl.className = "dice-wrapper";
		return newDiceEl;
	}
	return document.getElementById(diceID);
}

function selectDiceType(diceInstance)
{
	let diceType = "";
	if(diceInstance.newConnection)
	{	
		//Show popup to select the dice Type
		diceType = prompt("Select the dice Type","D6");
		diceInstance.setDieType(GoDice.diceTypes[diceType]);
	}

	return;
}

function getDiceTypeString(diceInstance)
{
	return Object.keys(GoDice.diceTypes)[diceInstance.getDieType()];
}

function getDiceColorString(diceInstance)
{
	return Object.keys(diceInstance.diceColour)[diceInstance.getDiceColor()];
}

function addConnectedDice(diceId, diceInstance)
{
	let diceType = getDiceTypeString(diceInstance);	
	let diceColor = getDiceColorString(diceInstance);
	
	let hotbar = document.getElementById('hotbar');
}

GoDice.prototype.onDiceConnected = (diceId, diceInstance) => {

	diceInstance.setDiceColor();
	if(connectedDice[diceId] != null)
	{
		console.log('Dice already connected');
	}
	else
	{
		console.log("Dice connected: ", diceId);
		selectDiceType(diceInstance);
		// Called when a new die is connected - create a dedicate panel for this die
		//addConnectedDice(diceId, diceInstance);
		connectedDice[diceId] = diceInstance;
		sessionStorage.setItem('connectedDice', JSON.stringify(connectedDice));
	}
};

GoDice.prototype.onRollStart = (diceId) => {
	console.log("Roll Start: ", diceId);
	// let diceType =  getDiceTypeString(connectedDice[diceId]);
	// // get rolling indicator
	// const diceIndicatorEl = document.getElementById(diceType + "-die-status");
	// // show rolling 
	// diceIndicatorEl.textContent = "Rolling....";
};

GoDice.prototype.onStable = (diceId, value, xyzArray) => {
	console.log("Stable event: ", diceId, value);
	let diceType =  getDiceTypeString(connectedDice[diceId]);
	// Get roll value indicator and show stable value
	const diceIndicatorEl = document.getElementById(diceType + "-die-status");
	diceIndicatorEl.textContent = "Stable";

	addRoll(diceId, value);
};

GoDice.prototype.onTiltStable = (diceId, xyzArray, value) => {
	console.log("TiltStable: ", diceId, xyzArray);
	let diceType =  getDiceTypeString(connectedDice[diceId]);
	// Get tile indicator and show raw data
	const diceIndicatorEl = document.getElementById(diceType + "-die-status");
	diceIndicatorEl.textContent = "Tilt Stable";

	addRoll(diceId, value);
};

GoDice.prototype.onFakeStable = (diceId, value, xyzArray) => {
	console.log("FakeStable: ", diceId, value);
	let diceType =  getDiceTypeString(connectedDice[diceId]);
	// Get tile indicator and show fake value
	const diceIndicatorEl = document.getElementById(diceType + "-die-status");
	diceIndicatorEl.textContent = "Fake Stable";

	addRoll(diceId, value);
};

GoDice.prototype.onMoveStable = (diceId, value, xyzArray) => {
	
	let diceType =  getDiceTypeString(connectedDice[diceId]);
	let diceColor = 
	console.log("MoveStable: ", diceType, diceId, value);

	addRoll(diceId, value);
};

GoDice.prototype.onBatteryLevel = (diceId, batteryLevel) => {
	console.log("BetteryLevel: ", diceId, batteryLevel);
	// get dice battery indicator element
	const batteryLevelEl = document.getElementById(diceId + "-battery-indicator");
	connectedDice[diceId].batteryLevel = batteryLevel;
	sessionStorage.setItem('connectedDice', JSON.stringify(connectedDice));
};

GoDice.prototype.onDiceColor = (diceId, color) => {
	let colorString =  Object.keys(this.diceColour)[color].toLowerCase();
	console.debug('DiceColor: ', diceId, color, colorString);
	//Set dice Color to class attribute as String
	connectedDice[diceId].dieColor = color;
	sessionStorage.setItem('connectedDice', JSON.stringify(connectedDice));
};

function addRoll(diceId, value)
{
	let diceType =  getDiceTypeString(connectedDice[diceId]);
	let colorString =  Object.keys(connectedDice[diceId].diceColour)[connectedDice[diceId].dieColor].toLowerCase();
	
	let flagAssigned = false;
	let id = 0;
	let diceRolls = document.querySelectorAll("[name^='"+$id+"-']");
	while (flag || diceRolls == null)
	{
		for (let i=0; i<diceRolls.length; i++)		
		{
			if(!diceRolls[i].parentElement.previousElementSibling.textContent.includes(diceType))
				break;
			let diceRoll = document.createElement('div');
			if(diceroll.value == '')
			{
				diceRoll.value = value;
				diceRoll.style.color = colorString;
				flag = true;
			}
		}
		id++;
		diceRolls = document.querySelectorAll("[name^='"+$id+"-']");
	}
	
}

function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function storePlayerName()
{
	let storedPlayerName = document.getElementById('player_name').value;
	 sessionStorage.setItem('playerName',storedPlayerName);
}

