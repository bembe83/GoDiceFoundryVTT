import { Utils } from "./Utils.mjs";

/**
 * @class
 * The popup shown during the roll.
 */
 
export class GoDiceRollPrompt extends FormApplication{
	
	constructor(){
		super(...arguments);
		this._nextId = 0;
		this._terms=[];
		this._rolled = false;
	}
	
	static get defaultOptions() {
		let modulePath = Utils.getModulePath();
        return mergeObject(FormApplication.defaultOptions, {
            title: game.i18n.localize("GODICE_ROLLS.Prompt.DefaultRollTitle"),
            template: modulePath+"templates/diceroll-prompt.hbs",
            width: 400,
        });
    }
    
	getData(_options){
        const data = [];
        for (const term of this._terms) {
            const die = term.term;
            for (let c = 0; c < die.number; c++) {
                data.push({
                    id: term.id.toString(),
                    idx: c,
                    faces: c == 0 ? `${die.number}d${die.faces}${die.modifiers.length > 0 ? ' [' + die.modifiers.join(',') + ']' : ''}` : '',
                    hasTotal: c == 0 && die.modifiers.length == 0 && die.number > 1,
                    term: die
                });
            }
        }
        return { terms: data };	
	}
	
	close(options) {
        // If we have not actually rolled anything yet, we need to resolve these with RNG values
        if (!this._rolled) {
            this._rolled = true;
            for (const x of this._terms) {
                const results = [];
                for (let c = 0; c < x.term.number; c++) {
                    results.push(Math.ceil(CONFIG.Dice.randomUniform() * x.term.faces));
                }
                x.res(results);
            }
        }
        return super.close(options);
    }
    
    render(force, options) {
        if (this._terms.length == 0)
            return;
        return super.render(force, options);
    }
    
    async _render(force, options) {
        await super._render(force, options);
        this.element.find('input')[0].focus();
    }
    
    _updateObject(_, formData) {
        for (const x of this._terms) {
            const results = [];
            const flags = [];
            for (let c = 0; c < x.term.number; c++) {
                const roll = formData[`${x.id}-${c}`];
                let value = parseInt(roll);
                if (isNaN(value)) {
                    value = Math.ceil(CONFIG.Dice.randomUniform() * x.term.faces);
                    flags.push('RN');
                }
                else {
                    flags.push('GR');
                    x.term.options.isGoDiceRoll = true;
                }
                results.push(value);
            }
            x.res(results);
        }
        this._rolled = true;
        return undefined;
    }
    
    requestResult(term) {
        return new Promise((res, _) => this._terms.push({ id: this._nextId++, res, term }));
    }
}