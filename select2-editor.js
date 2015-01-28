(function (Handsontable) {
    "use strict";

    var Select2Editor = Handsontable.editors.TextEditor.prototype.extend();

    Select2Editor.prototype.prepare = function (row, col, prop, td, originalValue, cellProperties) {

        Handsontable.editors.TextEditor.prototype.prepare.apply(this, arguments);

        this.options = {};

        if (this.cellProperties.select2Options) {
            this.options = $.extend(this.options, cellProperties.select2Options);
        }
    };

    Select2Editor.prototype.createElements = function () {
        this.$body = $(document.body);
        this.wtDom = Handsontable.Dom;

        this.TEXTAREA = document.createElement('input');
        this.TEXTAREA.setAttribute('type', 'text');
        this.$textarea = $(this.TEXTAREA);
        
        this.wtDom.addClass(this.TEXTAREA, 'handsontableInput');

        this.textareaStyle = this.TEXTAREA.style;
        this.textareaStyle.width = 0;
        this.textareaStyle.height = 0;

        this.TEXTAREA_PARENT = document.createElement('DIV');
        this.wtDom.addClass(this.TEXTAREA_PARENT, 'handsontableInputHolder');

        this.textareaParentStyle = this.TEXTAREA_PARENT.style;
        this.textareaParentStyle.top = 0;
        this.textareaParentStyle.left = 0;
        this.textareaParentStyle.display = 'none';

        this.TEXTAREA_PARENT.appendChild(this.TEXTAREA);

        this.instance.rootElement.appendChild(this.TEXTAREA_PARENT);

        var that = this;
        Handsontable.PluginHooks.add('afterRender', function () {
            that.instance._registerTimeout('refresh_editor_dimensions', function () {
                that.refreshDimensions();
            }, 0);
        });
    };

    var onSelect2Changed = function () {
        this.close();
        this.finishEditing();
    };
    var onSelect2Closed = function () {
        this.close();
        this.finishEditing();
    };
    var onBeforeKeyDown = function onBeforeKeyDown(event) {

        var instance = this;
        var that = instance.getActiveEditor();

        var keyCodes = Handsontable.helper.keyCode;
        var ctrlDown = (event.ctrlKey || event.metaKey) && !event.altKey; //catch CTRL but not right ALT (which in some systems triggers ALT+CTRL)


        //Process only events that have been fired in the editor
        if (event.target !== that.TEXTAREA || event.isImmediatePropagationStopped()) {
            return;
        }

        if (event.keyCode === 17 || event.keyCode === 224 || event.keyCode === 91 || event.keyCode === 93) {
            //when CTRL or its equivalent is pressed and cell is edited, don't prepare selectable text in textarea
            event.stopImmediatePropagation();
            return;
        }

        switch (event.keyCode) {
            case keyCodes.ENTER:
                var selected = that.instance.getSelected();
                var isMultipleSelection = !(selected[0] === selected[2] && selected[1] === selected[3]);
                if ((ctrlDown && !isMultipleSelection) || event.altKey) { //if ctrl+enter or alt+enter, add new line
                    if (that.isOpened()) {
                        that.val(that.val() + '\n');
                        that.focus();
                    } else {
                        that.beginEditing(that.originalValue + '\n')
                    }
                    event.stopImmediatePropagation();
                }
                event.preventDefault(); //don't add newline to field
                break;

            case keyCodes.A:
            case keyCodes.X:
            case keyCodes.C:
            case keyCodes.V:
                if (ctrlDown) {
                    event.stopImmediatePropagation(); //CTRL+A, CTRL+C, CTRL+V, CTRL+X should only work locally when cell is edited (not in table context)
                    break;
                }
            case keyCodes.HOME:
            case keyCodes.END:
                event.stopImmediatePropagation(); //home, end should only work locally when cell is edited (not in table context)
                break;
        }

    };

    

    Select2Editor.prototype.open = function () {
		this.refreshDimensions();
        this.textareaParentStyle.display = 'block';
        this.instance.addHook('beforeKeyDown', onBeforeKeyDown);

        this.$textarea.css({
            height: $(this.TD).height(),
            'min-width': $(this.TD).outerWidth()
        });

        //display the list
        this.$textarea.show();

        //make sure that list positions matches cell position
        this.$textarea.offset($(this.TD).offset());

        var self = this;
        this.$textarea.select2(this.options)
            .on('change', onSelect2Changed.bind(this))
            .on('select2-close', onSelect2Closed.bind(this))
            .on("select2-open", function (event) {
                var search = $('.select2-drop-active .select2-search .select2-input');
                search.val(self.$textarea.val()).trigger('paste');
            });

        setTimeout(function () {
            self.$textarea.select2('focus');
            self.$textarea.select2('container').find('.select2-choice').trigger('mousedown').trigger('mouseup');
        }, 50);

    };

    Select2Editor.prototype.close = function () {
        this.instance.listen();
        this.instance.removeHook('beforeKeyDown', onBeforeKeyDown);
        this.$textarea.off();
        this.$textarea.hide();
        Handsontable.editors.TextEditor.prototype.close.apply(this, arguments);
    };

    Select2Editor.prototype.val = function (value) {
        if (typeof value == 'undefined') {
            return this.$textarea.val();
        } else {
            this.$textarea.val(value);
        }
    };

    Select2Editor.prototype.focus = function () {

        this.instance.listen();

        // DO NOT CALL THE BASE TEXTEDITOR FOCUS METHOD HERE, IT CAN MAKE THIS EDITOR BEHAVE POORLY AND HAS NO PURPOSE WITHIN THE CONTEXT OF THIS EDITOR
        //Handsontable.editors.TextEditor.prototype.focus.apply(this, arguments);
    };

    Select2Editor.prototype.beginEditing = function (initialValue) {
        var onBeginEditing = this.instance.getSettings().onBeginEditing;
        if (onBeginEditing && onBeginEditing() === false) {
            return;
        }

        Handsontable.editors.TextEditor.prototype.beginEditing.apply(this, arguments);

    };

    Select2Editor.prototype.finishEditing = function (isCancelled, ctrlDown) {
        this.instance.listen();
        return Handsontable.editors.TextEditor.prototype.finishEditing.apply(this, arguments);
    };

    Handsontable.editors.Select2Editor = Select2Editor;
    Handsontable.editors.registerEditor('select2', Select2Editor);

})(Handsontable);
