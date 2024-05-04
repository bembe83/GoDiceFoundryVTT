import { Utils, MODULE_NAME } from "./Utils.mjs";
import { GoDiceRollPrompt } from "./GoDiceRollPrompt.mjs";

export const GODICE_ENABLED = "GoDiceEnabled";
export const GODICE_AUTOSEND = "GoDiceAutoSend";
export const ROLLED_TIMEOUT = 5000;
export var godiceroll_modifier = 0;
export var advdis_modifier = "";

/**
 * @class
 * The class that implements the roll using the physical dice and inject items in the UI.
 */
export class GoDiceRoll {

	static init() {
		game.settings.register(MODULE_NAME, GODICE_ENABLED, {
			config: true,
			type: Boolean,
			default: true,
			name: game.i18n.localize('Enable GoDice roll'),
			hint: game.i18n.localize('Enable GoDice roll'),
			onChange: value => {
				console.debug(`Is the GoDice roll enabled? ${value}`)
			}
		});
		game.settings.register(MODULE_NAME, GODICE_AUTOSEND, {
			config: true,
			type: Boolean,
			default: false,
			name: game.i18n.localize('Enable Auto Send GoDice roll'),
			hint: game.i18n.localize('Enable send GoDice roll when all the input fileds are populated with numbers'),
			onChange: value => {
				console.debug(`Is the GoDice auto send roll enabled? ${value}`)
			}
		});
		
		let dbEl = document.createElement('div');
		dbEl.id = 'round-time-bar';
		dbEl.setAttribute('class', 'round-time-bar');
		dbEl.style = "--duration:" + (ROLLED_TIMEOUT / 1000) + ";";
		dbEl.setAttribute("data-style", "smooth");
		dbEl.appendChild(document.createElement('div'));

		if (document.querySelector('#loading') !== null) {
			let hbEl = document.querySelector('#loading');	
			hbEl.insertAdjacentElement('afterend', dbEl);
		}
		
	}

	static async injectModifier() {

		// Getting the chat controls div
		let chatControls = document.getElementById("chat-controls");

		if (!chatControls) {
			console.debug("'chat-controls' element not found");
			return;
		}

		if (document.getElementById("godiceroll-modifier")) {
			console.debug("'godiceroll-modifier' already exists");
			return;
		}

		if (document.getElementById("rangenumber")) {
			let input = document.getElementById("rangenumber");
			input.addEventListener('input', () => {
				godiceroll_modifier = parseInt(input.value);
			});
			return;
		}

		let template = await renderTemplate(Utils.getModulePath() + "templates/chat_control_mod.hbs", {});
		let modContainer = Utils.htmlToElement(template);
		chatControls.appendChild(modContainer);

		let rangeElement = document.getElementById("rangenumber");
		rangeElement.addEventListener('input', () => {
			let rangeValue = document.getElementById("rangevalue");
			rangeValue.textContent = rangeElement.value;
			godiceroll_modifier = parseInt(rangeElement.value);
		});

		var buttons = document.getElementsByClassName("godiceroll-advdis-btn");
		var arr = [...buttons];
		arr.forEach((element) => {
			element.addEventListener("click", () => {
				if (!element.classList.contains('active'))
					element.classList.add('active');
				advdis_modifier = element.dataset.value;
				arr.filter(function(item) { return item != element; }).forEach((item) => {
					item.classList.remove('active');
				});
			});
		});
	}

	static removeModifier() {
		let mod = document.getElemntById("godiceroll-modifier");
		if (mod) {
			mod.remove();
		}
	}

	static isEnabled() {
		return game.settings.get(MODULE_NAME, GODICE_ENABLED);
	}

	static isAutoSendEnabled() {
		return game.settings.get(MODULE_NAME, GODICE_AUTOSEND);
	}

	static patch() {
		/*libWrapper.register(MODULE_NAME, 'Roll.prototype._evaluate', this._Roll_evaluate, 'MIXED');
		libWrapper.register(MODULE_NAME, 'DiceTerm.prototype._evaluate', this._DiceTerm_evaluate, 'MIXED');
		libWrapper.register(MODULE_NAME, 'Die.prototype.reroll', this._Die_reroll, 'MIXED');
		libWrapper.register(MODULE_NAME, 'Die.prototype.explode', this._Die_explode, 'MIXED');*/
		GoDiceRoll.injectModifier();
	}

	static unpatch() {
		libWrapper.unregister(MODULE_NAME, 'Roll.prototype._evaluate', this._Roll_evaluate, 'MIXED');
		libWrapper.unregister(MODULE_NAME, 'DiceTerm.prototype._evaluate', this._DiceTerm_evaluate, 'MIXED');
		libWrapper.unregister(MODULE_NAME, 'Die.prototype.reroll', this._Die_reroll, 'MIXED');
		libWrapper.unregister(MODULE_NAME, 'Die.prototype.explode', this._Die_explode, 'MIXED');
		GoDiceRoll.removeModifier();
	}

	static async roll(roll, reroll = false) {

		let toRoll = roll;

		if (reroll) {
			let formula = [];

			roll.terms.filter((die) => {
				return die instanceof DiceTerm && die.results.filter((res) => {
					return ((res.rerolled && !res.active) || res.exploded)
				}).length > 0
			}).forEach(die => {
				const rgx = /(rr|x|X)([0-9]+)?([<>=]+)?([0-9]+)?/i;
				const match = die.modifiers.filter(mod => { return mod.match(rgx) });
				let modif = match.length > 0 ? match.join("") : "";
				formula.push(die.results.filter((res) => {
					return ((res.rerolled && !res.active) || res.exploded)
				}).length + "d" + die.faces + modif);
			});

			if (formula.length > 0) {
				let stringFormula = formula.join("+");
				toRoll = new Roll(stringFormula);
			} else {
				return;
			}
		}

		let rollPrompt = new GoDiceRollPrompt();
		const promises = [];
		for (const term of toRoll.terms) {
			if (term._evaluated)
				continue;
			if (term instanceof DiceTerm)
				term.rollPrompt = rollPrompt;
			promises.push(term.evaluate({ minimize: false, maximize: false, async: true }));
		}

		await rollPrompt.render(true);
		await Promise.all(promises);

		await GoDiceRoll.roll(toRoll, true);

		if (reroll) {
			toRoll.terms.forEach(newDie => {
				if (newDie instanceof DiceTerm && newDie.faces) {
					let newResults = newDie.results;
					roll.terms.forEach(die => {
						if (die instanceof DiceTerm && die.faces === newDie.faces)
							die.results = die.results.concat(newResults)
					});
				}
			});
		} else {
			//reapply keep and drop modifiers after adding the reroll values
			roll.terms.forEach(die => {
				const rgx = /(k[hl]|d[hl])/i;
				const match = die.modifiers?.filter(mod => { return mod.match(rgx) });
				if (match && match.length > 0) {
					let actual_modifiers = roll.modifiers;
					die.modifiers = match;
					die._evaluateModifiers();
					die.modifiers = actual_modifiers
				}
			});
		}



	}

	static async _Roll_evaluate(wrapper, { minimize = false, maximize = false } = {}) {
		if (!GoDiceRoll.isEnabled() || minimize || maximize || this.isSingleRoll) {
			return wrapper({ minimize, maximize });
		}
		// Step 1 - Replace intermediate terms with evaluated numbers
		const intermediate = [];
		for (const element of this.terms) {
			let term = element;
			if (!(term instanceof RollTerm)) {
				throw new Error("Roll evaluation encountered an invalid term which was not a RollTerm instance");
			}
			if (term.isIntermediate) {
				await term.evaluate({ minimize, maximize, async: true });
				this._dice = this._dice.concat(term.dice);
				term = new NumericTerm({ number: term.total, options: term.options });
			}
			intermediate.push(term);
		}
		this.terms = intermediate;
		// Step 2 - Simplify remaining terms
		this.terms = this.constructor.simplifyTerms(this.terms);

		// Step 3 - Evaluate remaining terms
		await GoDiceRoll.roll(this);
		
		// Step 4 - Evaluate the final expression
		this._total = this._evaluateTotal();
		return this;
	}

	static async _DiceTerm_evaluate(wrapper, { minimize = false, maximize = false } = {}) {
		const rollPrompt = this.rollPrompt;

		if (!GoDiceRoll.isEnabled() || !rollPrompt || minimize || maximize)
			return wrapper(minimize, maximize);
		const results = await rollPrompt.requestResult(this);
		for (const x of results)
			this.results.push({ result: x, active: true });
		this._evaluateModifiers();
		return this;
	}

	static async _Die_reroll(wrapper, modifier, { recursive = false } = {}) {

		if (!GoDiceRoll.isEnabled())
			return wrapper(modifier, recursive);

		// Match the re-roll modifier
		const rgx = /rr?([0-9]+)?([<>=]+)?([0-9]+)?/i;
		const match = modifier.match(rgx);
		if (!match) return false;
		let [max, comparison, target] = match.slice(1);

		// If no comparison or target are provided, treat the max as the target
		if (max && !(target || comparison)) {
			target = max;
			max = null;
		}

		// Determine target values
		max = Number.isNumeric(max) ? parseInt(max) : null;
		target = Number.isNumeric(target) ? parseInt(target) : 1;
		comparison = comparison || "=";

		// Recursively reroll until there are no remaining results to reroll
		let checked = 0;
		let initial = this.results.length;
		while (checked < this.results.length) {
			let r = this.results[checked];
			checked++;
			if (!r.active) continue;

			// Maybe we have run out of rerolls
			if ((max !== null) && (max <= 0)) break;

			// Determine whether to re-roll the result
			if (DiceTerm.compareResult(r.result, comparison, target)) {
				r.rerolled = true;
				r.active = false;
				if (max !== null) max -= 1;
			}

			// Limit recursion
			if (!recursive && (checked >= initial)) checked = this.results.length;
			if (checked > 1000) throw new Error("Maximum recursion depth for exploding dice roll exceeded");
		}
	}

	/**
	* Explode the Die, rolling additional results for any values which match the target set.
	* If no target number is specified, explode the highest possible result.
	* Explosion can be a "small explode" using a lower-case x or a "big explode" using an upper-case "X"
	*
	* @param {string} modifier     The matched modifier query
	* @param {boolean} recursive   Explode recursively, such that new rolls can also explode?
	*/
	static async _Die_explode(wrapper, modifier, { recursive = true } = {}) {

		if (!GoDiceRoll.isEnabled())
			return wrapper(modifier, recursive);

		// Match the "explode" or "explode once" modifier
		const rgx = /xo?([0-9]+)?([<>=]+)?([0-9]+)?/i;
		const match = modifier.match(rgx);
		if (!match) return false;
		let [max, comparison, target] = match.slice(1);

		// If no comparison or target are provided, treat the max as the target value
		if (max && !(target || comparison)) {
			target = max;
			max = null;
		}

		// Determine target values
		target = Number.isNumeric(target) ? parseInt(target) : this.faces;
		comparison = comparison || "=";

		// Determine the number of allowed explosions
		max = Number.isNumeric(max) ? parseInt(max) : null;

		// Recursively explode until there are no remaining results to explode
		let checked = 0;
		const initial = this.results.length;
		while (checked < this.results.length) {
			let r = this.results[checked];
			checked++;
			if (!r.active) continue;

			// Maybe we have run out of explosions
			if ((max !== null) && (max <= 0)) break;

			// Determine whether to explode the result and roll again!
			if (DiceTerm.compareResult(r.result, comparison, target)) {
				r.exploded = true;
				if (max !== null) max -= 1;
			}

			// Limit recursion
			if (!recursive && (checked === initial)) break;
			if (checked > 1000) throw new Error("Maximum recursion depth for exploding dice roll exceeded");
		}
	}
}