import { openConnectionDialog } from "./godice-handler.js"

Hooks.on('renderUserConfig', (app: UserConfig, html: JQuery<HTMLElement>) => {
	if (!game.user.isGM) return;
	const rollConfig = `$(<div class="form-group">
		<button onclick="openConnectionDialog()">${'Connect Dice'.localize()}</button>
	</div>`);
	html.find('input[name="color"]').parent().after(rollConfig);
	// Resize the window
	app.element[0].style.height = '';
	app.element[0].style.width = '';
	app.setPosition({});
	(app as any)._updateObject_ORIG = (app as any)._updateObject;
	(app as any)._updateObject = async function (...args: any) {
		const result = await (this as any)._updateObject_ORIG(...args);
		ui.controls.initialize();
		return result;
	};
});