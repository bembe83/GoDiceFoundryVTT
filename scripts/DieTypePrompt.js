/**
 * @class
 * The Prompt to choose the connected die type.
 */
class DieTypePrompt {
	async showTypePrompt(diceInstance) {
		let diceType = null;
		if (diceInstance) {
			//Show popup to select the dice Type
			if (game) {
				let modulePath = Utils.getModulePath();
				let data = [];
				for (const typeKey of Object.keys(GoDice.diceTypes)) {
					data.push({
						id: GoDice.diceTypes[typeKey],
						type: typeKey
					});
				}
				let args = {};
				args["label"] = game.i18n.localize("GODICE_ROLLS.Prompt.Header_DiceType");
				args["diceTypes"] = data;
				args["path"] = modulePath + "images/";
				args["dieColor"] = diceInstance.getDieColor(true);
				let template;
				template = await renderTemplate(modulePath + "templates/diceType-prompt.hbs", args);
				await Dialog.prompt({
					title: game.i18n.localize("GODICE_ROLLS.Prompt.DefaultTitle"),
					content: template,
					icon: `<i class="fas fa-check"></i>`,
					label: game.i18n.localize("GODICE_ROLLS.Submit"),
					callback: async (html) => {
						diceType = DieTypePrompt.getSelectedDie();
					},
					options: {
						height: '140px'
					}
				});
				if (diceType) {
					console.log("Selected Dice Type:", diceType);
				}
				else
					console.log("Error retrieving Die Type");
			}
			else
				diceType = window.prompt("Insert die type", "D6");
		} 
		return diceType;
	}

	static getSelectedDie() {
		let selectedValue = null;
		let selectElement = document.getElementById('diceTypes');
		if (selectElement) {
			let selectedIndex = selectElement.selectedIndex;
			selectedValue = selectElement[selectedIndex].id;
		}
		else {
			console.log("No diceTypes element found");
		}
		return selectedValue;
	}

	static changeImageDie() {
		let selectedDice = DieTypePrompt.getSelectedDie();
		if (selectedDice) {
			let imgEl = document.getElementById('diceTypeIcon');
			imgEl.src = Utils.getModulePath() + "images/" + selectedDice + ".webp";
		}
	}
}