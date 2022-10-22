
class DiceBar extends Hotbar {
	/**
	 * @param {DiceBarPopulator} populator
	 * @param {*} options 
	 */
	constructor(populator, options) {
		super(options);
		if (!game.macros.apps.find((app) => app.constructor.name == "DiceBar")) game.macros.apps.push(this);
		/**
		 * The currently viewed macro page
		 * @type {number}
		 */
		this.page = 1;
		/**
		 * The currently displayed set of macros
		 * @type {Array}
		 */
		this.dice = [];
		/**
		 * Track collapsed state
		 * @type {boolean}
		 */
		this._collapsed = false;
		/**
		 * Track which hotbar slot is the current hover target, if any
		 * @type {number|null}
		 */
		this._hover = null;

		this.populator = populator;
	}

	/** @override */
	static get defaultOptions() {
		let templatePath = Utils.getModulePath() + "templates/dicebar.html";
		return mergeObject(super.defaultOptions, {
			id: "dicebar",
			template: templatePath,
			popOut: false,
			dragDrop: [{ dragSelector: ".dice-icon", dropSelector: "#dice-list" }]
		});
	}

	/* -------------------------------------------- */

	/** @override */
	getData(options) {
		this.dice = this._getDiceByPage(this.page);
		return {
			page: this.page,
			dice: this.dice,
			barClass: this._collapsed ? "collapsed" : ""
		};
	}

	/* -------------------------------------------- */

	/**
	 * Get the Array of Dice (or null) values that should be displayed on a numbered page of the DiceBar
	 * @param {number} page
	 * @returns {Array}
	 * @private
	 */
	_getDiceByPage(page) {
		const dice = this.getDiceBarDice(page);
		let imgFolder = Utils.getModulePath() + "images/";
		for (let [i, d] of Object.entries(dice)) {
			let isDice = d.die instanceof GoDiceExt;
			let dieType = isDice ? d.die.getDieType(true).replace("X", "") : "";
			let dieColor = isDice ? d.die.getDieColor(true) : "";
			d.customSlot = parseInt(i) < 9 ? parseInt(i) + 1 : 0;
			d.cssClass = isDice ? "active" : "inactive";
			d.icon = isDice ? 'fas fa-dice-' + dieType.toLowerCase() : null;
			d.img = isDice ? imgFolder + dieType + ".webp" : imgFolder + "plus.webp";
			d.dieColor = dieColor;
			d.diceId = isDice ? d.die.diceId : "";
			d.tooltip = isDice ? dieType + " - " + dieColor : "GODICE_ROLLS.Tools.AddDice";
		}
		return dice;
	}

	/**
	* Get an Array of Dice Entities on this User's Hotbar by page
	* @param {number} page     The dicebar page number
	* @return {Array.<Object>}
	*/
	getDiceBarDice(page = 1) {
		let maxslots = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--dicebar-slots"));;
		const dice = Array.fromRange(maxslots).map(d => new Object());
		for (let [k, v] of Object.entries(this.populator.diceMap)) {
			dice[parseInt(k) - 1] = connectedDice.get(v);
		}
		const start = (page - 1) * maxslots;
		return dice.slice(start, start + maxslots).map((d, i) => {
			return {
				slot: start + i + 1,
				die: d
			};
		});
	}

	/**
	* Assign a Dice to a numbered DiceBar slot between 1 and 10
	* @param  {GoDiceExt|null} dice  The Dice entity to assign
	* @param  {number} slot       The integer Hotbar slot to fill
	* @param  {number} [fromSlot] An optional origin slot from which the Macro is being shifted
	* @return {Promise}          A Promise which resolves once the User update is complete
	*/
	async assignDiceBarDice(dice, slot, { fromSlot = null } = {}) {
		console.debug("DiceBar | assignDiceBarDice: dice", dice);
		console.debug("DiceBar | assignDiceBarDice: slot", slot);
		console.debug("DiceBar | assignDiceBarDice: fromSlot", fromSlot);

		if (!(dice instanceof GoDiceExt || dice instanceof GoDice) && (dice !== null)) throw new Error("Invalid Dice provided");

		// If a slot was not provided, get the first available slot
		let maxslots = parseInt(connectedDice.size) + 1 || parseInt(getComputedStyle(document.documentElement).getPropertyValue("--dicebar-slots"));
		let freeslots = ui.dicebar.dice.filter(d => { return d.diceId === "" });
		let freeslot = freeslots && freeslots.length > 0 ? freeslots[0].slot : null
		slot = slot ? parseInt(slot) : parseInt(freeslot);
		if (!slot) throw new Error("No available DiceBar slot exists");
		if (slot < 1 || slot > maxslots) throw new Error("Invalid DiceBar slot requested");

		// Update the hotbar data
		if (dice) {
			console.debug("DiceBar | Setting dice with ID: ", dice.diceId, "to slot:", slot);
			await this.populator.setDie(dice.diceId, slot);
		}
		else {
			console.debug('DiceBar | Unsetting dice from slot:', slot);
			await this.populator.unsetDie(slot);
		}

		Utils.setDiceBarMaxSlots();
		this.dice = this._getDiceByPage(this.page);
		ui.dicebar.render();
		//code suggested by tposney. creates hook to allow reassignment of monkey hotpatch
		Hooks.callAll("DiceBarAssignComplete");
		return ui.dicebar.render();
	};

	/* -------------------------------------------- */
	/**
	 * Collapse the ui.dicebar, minimizing its display.
	 * @return {Promise}    A promise which resolves once the collapse animation completes
	 */
	async collapse() {
		if (this._collapsed) return true;
		const toggle = this.element.find("#dicebar-toggle");
		const icon = toggle.children("i");
		const bar = this.element.find("#dice-action-bar");
		return new Promise(resolve => {
			bar.slideUp(200, () => {
				bar.addClass("collapsed");
				icon.removeClass("fa-caret-down").addClass("fa-caret-up");
				this._collapsed = true;
				resolve(true);
			});
		});
	}

	/* -------------------------------------------- */
	/**
	 * Expand the CustomHotbar, displaying it normally.
	 * @return {Promise}    A promise which resolves once the expand animation completes
	 */
	expand() {
		if (!this._collapsed) return true;
		const toggle = this.element.find("#dicebar-toggle");
		const icon = toggle.children("i");
		const bar = this.element.find("#dice-action-bar");
		return new Promise(resolve => {
			bar.slideDown(200, () => {
				bar.css("display", "");
				bar.removeClass("collapsed");
				icon.removeClass("fa-caret-up").addClass("fa-caret-down");
				this._collapsed = false;
				resolve(true);
			});
		});
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	_contextMenu(html) {
		ContextMenu.create(this, html, ".dice", this._getEntryContextOptions());
	}

	/* -------------------------------------------- */

	/**
	 * Get the Macro entry context options
	 * @returns {object[]}  The Macro entry context options
	 * @private
	 */
	_getEntryContextOptions() {
		return [
			{
				name: "GODICE_ROLLS.DiceBar.EditType",
				icon: '<i class="fas fa-edit"></i>',
				callback: async li => {
					let diceInstance = connectedDice.get(this.populator.diceMap[li.data("slot")]);
					let diePrompt = new DieTypePrompt();
					dieType = await diePrompt.showTypePrompt(diceInstance);
					diceInstance.setDieType(dieType);
					this.render();
				}
			},
			{
				name: "GODICE_ROLLS.DiceBar.RemoveDice",
				icon: '<i class="fas fa-trash"></i>',
				callback: async li => {
					Utils.disconnectDice(this.populator.diceMap[li.data("slot")]);
				}
			},
		];
	}

	/* -------------------------------------------- */
	/*  Event Listeners and Handlers
	  /* -------------------------------------------- */
	/** @override */
	activateListeners(html) {
		super.activateListeners(html);

		// Macro actions
		html.find('#dicebar-toggle').click(this._onToggleBar.bind(this));
		html.find(".dice").click(this._onClickDie.bind(this));

		// Activate context menu
		//this._contextMenu(html);
	}

	/* -------------------------------------------- */

	/** @override */
	_canDragDrop(selector) {
		return false;
	}

	/** @override */
	async _onDrop(event) {
		event.preventDefault();
		console.debug("DiceBar | dicebar drop detected!");
		await ui.dicebar.render();
	}

	/**
	 * Handle left-click events
	 * @param event
	 * @private
	 */
	async _onClickDie(event) {
		console.debug("Die click detected!", event);

		event.preventDefault();
		const li = event.currentTarget;

		// Case 1 - create a new Macro
		if (li.classList.contains("inactive")) {
			Utils.openConnectionDialog();
		}

		// Case 2 - trigger a Macro
		else {
			const die = connectedDice.get(this.populator.diceMap[li.dataset.slot]);
			die.pulseLed(5, 5, 5, [0, 0, 255]);
		}
	}
}