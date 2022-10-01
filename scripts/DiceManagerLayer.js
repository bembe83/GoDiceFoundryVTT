/**
 * The DiceManager Layer which contains DiceManager canvas objects.
 * @category - Canvas
 */
class DiceManagerLayer extends InteractionLayer {

  /** @inheritdoc */
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: "dicemanager"
    });
  }

  /* -------------------------------------------- */
  /*  Methods
  /* -------------------------------------------- */

  /** @override */
  _activate() {
    super._activate();
  }

  /* -------------------------------------------- */

  /** @override */
  _deactivate() {
    super._deactivate();
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onClickLeft(event) {
      super._onClickLeft(event);
  }

}