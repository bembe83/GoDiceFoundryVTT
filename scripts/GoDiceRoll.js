/**
 * 
 */
 
 class GoDiceRoll {
	
	static GODICE_ENABLED = "GoDiceEnabled";
	
	static init(){
		game.settings.register(MODULE_NAME, GoDiceRoll.GODICE_ENABLED, {
		config: true,
		type: Boolean,
		default: false,
		name: game.i18n.localize('Disable GoDice roll'),
		hint: game.i18n.localize('Disable GoDice roll'),
		onChange: value => {
			console.debug(`Is the GoDice roll disabled? ${value}`)
		}
	});
	}
	
	static isEnabled(){
		return game.settings.get(MODULE_NAME, GoDiceRoll.GODICE_ENABLED); 
	}
	
	static patch(){
		libWrapper.register(MODULE_NAME, 'Roll.prototype._evaluate', this._Roll_evaluate, 'MIXED');
		libWrapper.register(MODULE_NAME, 'DiceTerm.prototype._evaluate', this._DiceTerm_evaluate, 'MIXED');
	}
	
	static unpatch(){
		libWrapper.unregister(MODULE_NAME, 'Roll.prototype._evaluate', this._Roll_evaluate, 'MIXED');
		libWrapper.unregister(MODULE_NAME, 'DiceTerm.prototype._evaluate', this._DiceTerm_evaluate, 'MIXED');
	}
	
	static async _Roll_evaluate (wrapper, { minimize =false, maximize = false } = {}){
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
        const rollPrompt = new GoDiceRollPrompt();
		for (const term of this.terms) {
            if (!(term instanceof DiceTerm))
                continue;
            term.rollPrompt = rollPrompt;
        }
        // Step 3 - Evaluate remaining terms
        const promises = [];
        for (const term of this.terms) {
            if (term._evaluated)
                continue;
            promises.push(term.evaluate({ minimize, maximize, async: true }));
        }        
        await rollPrompt.render(true);
        await Promise.all(promises);
        // Step 4 - Evaluate the final expression
        this._total = this._evaluateTotal();
        return this;
	}
	
	static async _DiceTerm_evaluate (wrapper, { minimize =false, maximize = false } = {}){
        const rollPrompt = this.rollPrompt;
       
        if (!GoDiceRoll.isEnabled() || !rollPrompt || minimize || maximize)
            return wrapper(minimize, maximize);
        const results = await rollPrompt.requestResult(this);
        for (const x of results)
            this.results.push({ result: x, active: true });
        this._evaluateModifiers();
        return this;
	}
	
}