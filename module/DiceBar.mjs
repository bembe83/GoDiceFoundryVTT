import { Utils, MODULE_NAME } from './Utils.mjs'; 
import { GoDice } from './GoDice.mjs';
import { GoDiceExt } from './GoDiceExt.mjs';
import { connectedDice } from './GoDiceExt.mjs';
import { DieTypePrompt } from './DieTypePrompt.mjs';

export async function diceBarInit() {

	console.log("DiceBar | Initializing...");
	ui.dicebar = new DiceBar();
	let obj = {
		enabled: true,
		left: 100,
		top: 100,
		width: 502,
		height: 52,
		scale: 1.0,
		log: true,
		renderContext: "dicebar",
		renderData: "init"
	};

	game.settings.register(MODULE_NAME, "DiceBarDisabled", {
		config: true,
		type: Boolean,
		default: false,
		name: game.i18n.localize('Disable DiceBar'),
		hint: game.i18n.localize('Disable Dice Bar'),
		onChange: value => {
			console.debug(`Is the DiceBar disabled? ${value}`)
		}
	});
	
	Hooks.on("collapseSidebar", ()=> {
		let r = document.querySelector(':root'); 
		let px = document.querySelector("#ui-right").offsetWidth;
		if(px <100)
			px = 5;
		r.style.setProperty('--dicebar-x-pos', px+"px");
	});

	let diceDisplay = "flex";
	if (game.settings.get(MODULE_NAME, "DiceBarDisabled") === true) {
		console.debug('DiceBar | User disabled dice bar.');
		diceDisplay = "none";
	}

	let r = document.querySelector(':root');
	let px = document.querySelector("#ui-right").offsetWidth;
	if(px <100)
		px = 5;
	r.style.setProperty('--dicebar-x-pos', px+"px");
	r.style.setProperty('--dicebar-display', diceDisplay);
	//r.style.setProperty('--godicemodule-path'), Utils.getModulePath());
	Utils.setDiceBarMaxSlots();

	ui.dicebar.render(true, obj);
}

export class DiceBar extends Hotbar {
	
	static init(){
		if (document.querySelector('#hud') !== null) {
			let hbEl = document.querySelector('#hud');
			let dbEl = document.createElement('template');
			dbEl.setAttribute('id', 'dicebar');
			hbEl.insertAdjacentElement('afterend', dbEl);
		}
	}
	/**
	 * @param {*} options 
	 */
	constructor(options) {
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

	}

	/** @override */
	static get defaultOptions() {
		let templatePath = Utils.getModulePath() + "templates/dicebar.hbs";
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
		const dice = [];
		let i = 0;
		connectedDice.forEach((die) => {
			dice.push(this.getDiceBarItem(die,i));
			i++;
		});
		dice.push(this.getDiceBarItem(new Object(),i));
		Utils.setDiceBarMaxSlots();
		return dice;
	}

	/**
	* Get an Array of Dice Entities on this User's Hotbar by page
	* @param {number} page     The dicebar page number
	* @return {Array.<Object>}
	*/
	getDiceBarItem(die, i) {
		let imgFolder = Utils.getModulePath() + "images/";
		let isDice = die instanceof GoDiceExt || die instanceof GoDice;
		let dieType = isDice ? die.getDieType(true).replace("X", "") : "";
		let dieColor = isDice ? die.getDieColor(true) : "";
		let d = new Object();
		
		d.customSlot = parseInt(i) < 9 ? parseInt(i) + 1 : 0;
		d.cssClass = isDice ? "active" : "inactive";
		d.icon = isDice ? 'fas fa-dice-' + dieType.toLowerCase() : 'fas fa-plus';
		d.img = isDice ? imgFolder + dieType + ".webp" : imgFolder + "plus.webp";
		d.dieColor = isDice? dieColor : "";
		d.diceId = isDice ? die.diceId : "";
		d.tooltip = isDice ? dieType + " - " + dieColor : "GODICE_ROLLS.Tools.AddDice";
		
		return d;
	}

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
		ContextMenu.create(this, html, ".dice.active", this._getEntryContextOptions());
		ContextMenu.create(this, html, ".dice.inactive", this._getEntryContextEmptyOptions());
	}

	/* -------------------------------------------- */

	/**
	 * Get the Dice entry context options
	 * @returns {object[]}  The Dice entry context options
	 * @private
	 */
	_getEntryContextOptions() {
		return [
			{
				name: "GODICE_ROLLS.DiceBar.EditType",
				icon: '<i class="fas fa-edit"></i>',
				callback: async li => {
					let diceInstance = connectedDice.get(li.data("diceId"));
					let diePrompt = new DieTypePrompt();
					let dieType = await diePrompt.showTypePrompt(diceInstance);
					if(dieType) {
						diceInstance.setDieType(dieType);
						Utils.saveDices();
					}else
						console.log("Error retrieving die type.", diceInstance);
					this.render();
				}
			},
			{
				name: "GODICE_ROLLS.DiceBar.RemoveDice",
				icon: '<i class="fas fa-trash"></i>',
				callback: async li => {
					Utils.disconnectDice(li.data("diceId"));
				}
			},
		];
	}
	
		/**
	 * Get the Dice entry context options
	 * @returns {object[]}  The Dice entry context options
	 * @private
	 */
	_getEntryContextEmptyOptions() {
		return [
			{
				name: "GODICE_ROLLS.DiceBar.AddDice",
				icon: '<i class="fas fa-plus"></i>',
				callback: async li => {
					Utils.openConnectionDialog();
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

		// Case 1 - connect a new die
		if (li.classList.contains("inactive")) {
			Utils.openConnectionDialog();
		}

		// Case 2 - make die blink
		else {
			const die = connectedDice.get(li.dataset.diceId);
			die?die.pulseLed(5, 5, 5, [0, 0, 255]):"";
		}
	}
}