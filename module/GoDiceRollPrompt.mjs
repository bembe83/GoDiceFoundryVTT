import { Utils, facesToImages, facesToIcon } from "./Utils.mjs";

/**
 * @class
 * The popup shown during the roll.
 */

export class GoDiceRollPrompt extends FormApplication {
	
	constructor(terms , roll, callback){
		super({});
        this.roll = roll;
        this.callback = callback;
        this._nextId = 0;
		this._terms = terms;
		this._rolled = false;
	}

	static get defaultOptions() {
		let modulePath = Utils.getModulePath();
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "godicemodule-resolver",
			title: game.i18n.localize("GODICE_ROLLS.Prompt.DefaultRollTitle"),
			template: modulePath + "templates/diceroll-prompt.hbs",
			width: 720,
			height: 290
		});
	}

	async getData(options ={}) {
		const context = await super.getData(options)
		context.terms = this._terms;
		
		for (const term of context.terms) {
			term.image = facesToIcon[term.faces];
			term.placeholder = Math.ceil(CONFIG.Dice.randomUniform() * term.faces)
		}
		
		context.roll = this.roll;		
		return context;
	}	
	    /** @override */
    _getSubmitData(updateData = {}) {
        const data = super._getSubmitData(updateData);

        // Find all input fields and add placeholder values to inputs with no value
        const inputs = this.form.querySelectorAll("input");
        for ( const input of inputs ) {
            if ( !input.value ) {
                data[input.name] = input.placeholder;
            }else{
				data[input.name] = input.value;
			}
        }

        return data;
    }

	render(force, options) {
		if (!this._terms || this._terms.length == 0)
			return;
		return super.render(force, options);
	}

	async _render(force, options) {
		await super._render(force, options);
		document.querySelector(':root').style.setProperty("--dice-grid", this._terms.length <4?this._terms.length:4);
		this.element.find('input')[0].focus();
	}

	async _updateObject(_, formData) {
		 // Turn the entries into a map
        const fulfilled = new Map();
        for ( const [id, result] of Object.entries(formData) ) {
            // Parse the result as a number
            fulfilled.set(id, Number(result));
        }
        this.callback(fulfilled);

	}

	requestResult(term) {
		return new Promise((res, _) => this._terms.push({ id: this._nextId++, res, term }));
	}

	/** @inheritdoc */
	activateListeners(html) {
		super.activateListeners(html);
		html.find(".dice-term-input").change((ev)=>{ Utils.rollFieldUpdate(ev.target); })
	}
}