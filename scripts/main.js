
// Open the Bluetooth connection dialog for choosing a GoDice to connect
function openConnectionDialog() {
	const newDice = new GoDice();
	newDice.requestDevice();
}

Hooks.on('getSceneControlButtons', (controls) => {
	controls.push({
		name: 'godicemanager',
		title: game.i18n.localize('GODICE_ROLLS.Connect'),
		icon: 'fas fa-dice',
		layer: 'godicemanager',
		tools: [
			{
			  name: 'connect',
			  title:  game.i18n.localize('GODICE_ROLLS.Connect'),
			  icon: 'fas fa-dice',
			  onClick: () => {
				openConnectionDialog();
			  },
			  button: true
			}
		],
        activeTool: 'connect',
	});
});

/**
 * Handles adding the custom brush controls pallet
 * and switching active brush flag
 */
Hooks.on('renderSceneControls', (controls) => {
  // Switching to layer
	if (controls.activeControl === 'godicemanager') {
		openConnectionDialog();
	}
});