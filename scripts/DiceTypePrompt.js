class DieTypePrompt
{
	static showTypePrompt(diceInstance)
	{
		let diceType = null;
		if(diceInstance.newConnection)
		{	
			//Show popup to select the dice Type
			if(game)
			{
				
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
		        args["path"] = "./images/"//Utils.modulePath+"/images";
		        args["diceColor"] = diceInstance.getDiceColorString();
		        let template = await renderTemplate("./templates/diceType-prompt.hbs", args);
				await Dialog.prompt({
						title: game.i18n.localize("GODICE_ROLLS.Prompt.DefaultTitle"),
						content: template,
						icon: `<i class="fas fa-check"></i>`,				
						label: game.i18n.localize("GODICE_ROLLS.Submit"),
						callback: async(html) => {
							diceType = getSelectedDie();
						},
						options: { 
							height:'140px'
						}
				});
				if(diceType)
				{
					console.log("Selected Dice Type:", diceType);
				}
				else
					console.log("Error retrieving Dice Type");
			}
			else
				diceType = window.prompt("Insert dice Type","D6");
		}else{
			diceType = diceInstance.getDieType(true);
		}

		return diceType;
	}

	getSelectedDie()
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

	changeImageDie()
	{
		let selectedDice = getSelectedDie();
		if(selectedDice)
		{
			let imgEl = document.getElementById('diceTypeIcon');
			imgEl.src="./images/"+selectedDice+".webp";
		}
	}
}