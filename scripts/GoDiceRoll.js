/**
 * 
 */
 let godiceroll_modifier=0;
 let advdis_modifier="";
 GODICE_ENABLED = "GoDiceEnabled";
 ROLLED_TIMEOUT = 5000;
 
 class GoDiceRoll {
	
	static init(){
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
		if (document.querySelector('#loading') !== null) {
			let hbEl = document.querySelector('#loading');
			let dbEl = document.createElement('div');
			dbEl.id = 'round-time-bar';
			dbEl.setAttribute('class', 'round-time-bar');
			dbEl.style="--duration:"+(ROLLED_TIMEOUT/1000)+";";
			dbEl.setAttribute("data-style", "smooth");
			dbEl.appendChild(document.createElement('div'));
			hbEl.insertAdjacentElement('afterend', dbEl);
		}
	}
		
	static async injectModifier() {
				
	    // Getting the chat controls div
	    let chatControls = document.getElementById("chat-controls");
	    
	    if(!chatControls)
	    {
			console.debug("'chat-controls' element not found");
	    	return;
		}
			
		if(document.getElementById("godiceroll-modifier"))
		{
			console.debug("'godiceroll-modifier' already exists");
			return;
		}
		
		if(document.getElementById("rangenumber"))
		{
			let input = document.getElementById("rangenumber");
			input.addEventListener('input', () => {
	        	godiceroll_modifier = parseInt(input.value);
	    	});
	    	return;
	    }
			
		let template = await renderTemplate(Utils.getModulePath() + "templates/chat_control_mod.hbs",{});
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
			if(!element.classList.contains('active'))
				element.classList.add('active');
		    advdis_modifier = element.dataset.value;
		    arr.filter(function (item) { return item != element; }).forEach((item) => {
		        item.classList.remove('active');
		      });
		  });
		});
    }
    
    static removeModifier()
    {
		let mod=document.getElemntById("godiceroll-modifier");
		if(mod)
		{
			mod.remove();			
		}
	}
	
	static isEnabled(){
		return game.settings.get(MODULE_NAME, GODICE_ENABLED); 
	}
	
	static patch(){
		libWrapper.register(MODULE_NAME, 'Roll.prototype._evaluate', this._Roll_evaluate, 'MIXED');
		libWrapper.register(MODULE_NAME, 'DiceTerm.prototype._evaluate', this._DiceTerm_evaluate, 'MIXED');
		GoDiceRoll.injectModifier();
	}
	
	static unpatch(){
		libWrapper.unregister(MODULE_NAME, 'Roll.prototype._evaluate', this._Roll_evaluate, 'MIXED');
		libWrapper.unregister(MODULE_NAME, 'DiceTerm.prototype._evaluate', this._DiceTerm_evaluate, 'MIXED');
		GoDiceRoll.removeModifier();
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