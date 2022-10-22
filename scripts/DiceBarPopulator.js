class DiceBarPopulator {
	constructor() {
		this.diceMap = this.getDice();
	}

	/**
	 * return the dice slots map.
	 * @return {string[]} [slot]: diceId
	 */
	getDice() {
		let dice = game.user.getFlag('go-dice-module', 'diceMap') || [];
		return dice;
	}

	/**
	 * Set or replace a dice on one of the dicebar slots.
	 * @param {string} diceId
	 * @param {number} slot 
	 * @return {Promise<unknown>} Promise indicating whether the dice was set and the dicebar was rendered.
	 */
	setDie(diceId, slot) {
		console.debug("DiceBar | Setting dice with slot and dice ID in diceMap");
		console.debug(slot);
		console.debug(diceId);
		console.debug(this);
		this.diceMap[slot] = diceId;
		return this._updateFlags();
	}

	/**
	 * Replace all dicebar slots from connectedDice map.
	 * @param {}
	 * @return {Promise<unknown>} Promise indicating whether the macros were set and the hotbar was rendered.
	 */
	setDice() {
		let maxslots = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--dicebar-slots"));
		for (let slot = 1; slot <= maxslots; slot++) {
			let dieId = Array.from(connectedDice.keys()).at(slot - 1);
			this.diceMap[slot] = dieId;
		}
		return this._updateFlags();
	}

	/**
	 * Remove the dice from the dicebar slot.
	 * @param {number} slot
	 * @return {Promise<unknown>} Promise indicating whether the macro was removed.
	 */
	unsetDie(slot) {
		this.diceMap[slot] = null;
		return this._updateFlags();
	}

	/**
	 * Remove all macros from the dicebar.
	 * @return {Promise<unknown>} Promise indicating whether the macros were removed.
	 */
	resetDice() {
		this.diceMap = [];
		return this._updateFlags();
	}

	async _updateFlags() {
		await game.user.unsetFlag('go-dice-module', 'diceMap');
		return game.user.setFlag('go-dice-module', 'diceMap', this.diceMap);
	}
}