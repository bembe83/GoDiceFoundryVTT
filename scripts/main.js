
// Open the Bluetooth connection dialog for choosing a GoDice to connect
function openConnectionDialog() {
	const newDice = new GoDice();
	newDice.requestDevice();
}

Hooks.on('getSceneControlButtons', (controls) => {
	controls.find(c => c.name == "token")
	.tools.push({
		name: 'connect',
		title:  game.i18n.localize('Connect'),
		icon: 'fas fa-dice',
		onClick: () => {  console.log("Dice Manager Clicked"); openConnectionDialog();},
		button: true
	});
});