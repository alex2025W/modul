/**
 * bootstrap-multiselect.js
 * https://github.com/davidstutz/bootstrap-multiselect
 *
 * Copyright 2012, 2013 David Stutz
 *
 * Dual licensed under the BSD-3-Clause and the Apache License, Version 2.0.
 * See the README.
 */
!function($) {

  "use strict";// jshint ;_;

  if (typeof ko !== 'undefined' && ko.bindingHandlers && !ko.bindingHandlers.multiselect) {
    ko.bindingHandlers.multiselect = {
      init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {},
      update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

         var config = ko.utils.unwrapObservable(valueAccessor());
         var selectOptions = allBindingsAccessor().options;
         var ms = $(element).data('multiselect');

         if (!ms) {
          $(element).multiselect(config);
         }
         else {
          ms.updateOriginalOptions();
          if (selectOptions && selectOptions().length !== ms.originalOptions.length) {
           $(element).multiselect('rebuild');
          }
         }
      }
    };
  }

  function Multiselect(select, options) {

    this.options = this.mergeOptions(options);
    this.$select = $(select);

    // Initialization.
    // We have to clone to create a new reference.
    this.originalOptions = this.$select.clone()[0].options;
    this.query = '';
    this.searchTimeout = null;

    this.options.multiple = this.$select.attr('multiple') === "multiple";
    this.options.onChange = $.proxy(this.options.onChange, this);

    // Build select all if enabled.
    this.buildContainer();
    this.buildButton();
    this.buildSelectAll();
    this.buildDropdown();
    this.buildDropdownOptions();
    this.buildFilter();
    this.updateButtonText();

    this.$select.hide().after(this.$container);
  };

  Multiselect.prototype = {

    // Default options.
    defaults: {
      // Default text function will either print 'None selected' in case no
      // option is selected, or a list of the selected options up to a length of 3 selected options by default.
      // If more than 3 options are selected, the number of selected options is printed.
      buttonText: function(options, select) {
        if (options.length === 0) {
          return this.nonSelectedText + ' <b class="caret"></b>';
        }
        else {
          if (options.length > this.numberDisplayed) {
            return options.length + ' ' + this.nSelectedText + ' <b class="caret"></b>';
          }
          else {
            var selected = '';
            options.each(function() {
              var label = ($(this).attr('label') !== undefined) ? $(this).attr('label') : $(this).html();

              selected += label + ', ';
            });
            return selected.substr(0, selected.length - 2) + ' <b class="caret"></b>';
          }
        }
      },
      // Like the buttonText option to update the title of the button.
      buttonTitle: function(options, select) {
        if (options.length === 0) {
          return this.nonSelectedText;
        }
        else {
          var selected = '';
          options.each(function () {
            selected += $(this).text() + ', ';
          });
          return selected.substr(0, selected.length - 2);
        }
      },
      // Create label
      label: function( element ){
        return $(element).attr('label') || $(element).html();
      },
      // Is triggered on change of the selected options.
      onChange : function(option, checked) {

      },
      // Is triggered on change of the selected options.
      onOpen : function(option) {

      },
      buttonClass: 'btn btn-default',
      dropRight: false,
      selectedClass: 'active',
      buttonWidth: 'auto',
      buttonContainer: '<div class="btn-group" />',
      // Maximum height of the dropdown menu.
      // If maximum height is exceeded a scrollbar will be displayed.
      maxHeight: false,
      includeSelectAllOption: false,
      selectAllText: ' Select all',
      selectAllValue: 'multiselect-all',
      enableFiltering: false,
      enableCaseInsensitiveFiltering: false,
      filterPlaceholder: 'Search',
      // possible options: 'text', 'value', 'both'
      filterBehavior: 'text',
      preventInputChangeEvent: false,
      nonSelectedText: 'None selected',
      nSelectedText: 'selected',
      numberDisplayed: 3,
      enableClickableOptGroups: false
    },

    // Templates.
    templates: {
      button: '<button type="button" class="multiselect dropdown-toggle" data-toggle="dropdown"></button>',
      ul: '<ul class="multiselect-container dropdown-menu"></ul>',
      filter: '<div class="input-prepend"><span class="add-on"><i class="icon-search"></i></span><input class="multiselect-search" type="text"></div>',
      li: '<li><a href="javascript:void(0);"><label></label></a></li>',
      liGroup: '<li><label class="multiselect-group"></label></li>'
    },

    constructor: Multiselect,

    buildContainer: function() {
      this.$container = $(this.options.buttonContainer);
    },

    buildButton: function() {
      // Build button.
      this.$button = $(this.templates.button).addClass(this.options.buttonClass);

      // Adopt active state.
      if (this.$select.prop('disabled')) {
        this.disable();
      }
      else {
        this.enable();
      }

      // Manually add button width if set.
      if (this.options.buttonWidth) {
        this.$button.css({
          'width' : this.options.buttonWidth
        });
      }

      // Keep the tab index from the select.
      var tabindex = this.$select.attr('tabindex');
      if (tabindex) {
        this.$button.attr('tabindex', tabindex);
      }

      this.$container.prepend(this.$button);
    },

    // Build dropdown container ul.
    buildDropdown: function() {

      // Build ul.
      this.$ul = $(this.templates.ul);

      if (this.options.dropRight) {
        this.$ul.addClass('pull-right');
      }

      // Set max height of dropdown menu to activate auto scrollbar.
      if (this.options.maxHeight) {
        // TODO: Add a class for this option to move the css declarations.
        this.$ul.css({
          'max-height': this.options.maxHeight + 'px',
          'overflow-y': 'auto',
          'overflow-x': 'hidden'
        });
      }

      this.$container.append(this.$ul);
    },

    // Build the dropdown and bind event handling.
    buildDropdownOptions: function() {

      this.$select.children().each($.proxy(function(index, element) {
        // Support optgroups and options without a group simultaneously.
        var tag = $(element).prop('tagName').toLowerCase();
        if (tag === 'optgroup') {
          this.createOptgroup(element);
        }
        else if (tag === 'option') {
          this.createOptionValue(element);
        }
        // Other illegal tags will be ignored.
      }, this));

      // Bind the change event on the dropdown elements.
      $(this.$ul).parents('.dropdown:first').on('click', $.proxy(function(event) {
        this.options.onOpen(this.$ul);
      }, this));

      // Bind the change event on the dropdown elements.
      $('li input', this.$ul).on('change', $.proxy(function(event) {
        var checked = $(event.target).prop('checked') || false;
        var isSelectAllOption = $(event.target).val() === this.options.selectAllValue;

        // Apply or unapply the configured selected class.
        if (this.options.selectedClass) {
          if (checked) {
            $(event.target).parents('li')
              .addClass(this.options.selectedClass);
          }
          else {
            $(event.target).parents('li')
              .removeClass(this.options.selectedClass);
          }
        }

        // Get the corresponding option.
        var value = $(event.target).val();
        var $option = this.getOptionByValue(value);

        var $optionsNotThis = $('option', this.$select).not($option);
        var $checkboxesNotThis = $('input', this.$container).not($(event.target));

        if (isSelectAllOption) {
          if (this.$select[0][0].value === this.options.selectAllValue) {
            var values = [];
            var options = $('option[value!="' + this.options.selectAllValue + '"]', this.$select);
            for (var i = 0; i < options.length; i++) {
              // Additionally check whether the option is visible within the dropcown.
              if (options[i].value !== this.options.selectAllValue && this.getInputByValue(options[i].value).is(':visible')) {
                values.push(options[i].value);
              }
            }

            if (checked) {
              this.select(values);
            }
            else {
              this.deselect(values);
            }
          }
        }

        if (checked) {
          $option.prop('selected', true);

          if (this.options.multiple) {
            // Simply select additional option.
            $option.prop('selected', true);
          }
          else {
            // Unselect all other options and corresponding checkboxes.
            if (this.options.selectedClass) {
              $($checkboxesNotThis).parents('li')
                .removeClass(this.options.selectedClass);
            }

            $($checkboxesNotThis).prop('checked', false);
            $optionsNotThis.removeAttr('selected')
              .prop('selected', false);

            // It's a single selection, so close.
            this.$button.click();
          }

          if (this.options.selectedClass === "active") {
            $optionsNotThis.parents("a")
              .css("outline", "");
          }
        }
        else {
          // Unselect option.
          $option.removeAttr('selected')
            .prop('selected', false);
        }

        this.$select.change();
        this.options.onChange($option, checked);
        this.updateButtonText();

        if(this.options.preventInputChangeEvent) {
          return false;
        }
      }, this));

      $('li a', this.$ul).on('touchstart click', function(event) {
        event.stopPropagation();
        $(event.target).blur();
      });

      if(this.options.enableClickableOptGroups){
        var self = this;
        $('.multiselect-group',this.$ul).on('touchstart click', function(event) {
          event.stopPropagation();
          var li = $(this).parents("li:first");
          var is_checked = !(li.data('ischecked') || false);
          li.data("ischecked",is_checked);
          var opt = li.next();
          while(opt && opt.length>0 && $(".multiselect-group",opt).length==0){
            var o_ch = $("input",opt).prop("checked");
            $("input",opt).prop("checked",is_checked);
            var value = $("input",opt).val();
            var $option = self.getOptionByValue(value);
            $option.prop('selected', is_checked);
            if(o_ch!=is_checked){
              self.options.onChange($option, is_checked);
              if (is_checked) {
                self.select([value]);
              }
              else {
                self.deselect([value]);
              }
            }
            opt = opt.next();
          }
          //$(event.target).blur();
          self.updateButtonText();
          self.$select.change();
        });
      }

      // Keyboard support.
      this.$container.on('keydown', $.proxy(function(event) {
        if ($('input[type="text"]', this.$container).is(':focus')) {
          return;
        }
        if ((event.keyCode === 9 || event.keyCode === 27) && this.$container.hasClass('open')) {
          // Close on tab or escape.
          this.$button.click();
        }
        else {
          var $items = $(this.$container).find("li:not(.divider):visible a");

          if (!$items.length) {
            return;
          }

          var index = $items.index($items.filter(':focus'));

          // Navigation up.
          if (event.keyCode === 38 && index > 0) {
            index--;
          }
          // Navigate down.
          else if (event.keyCode === 40 && index < $items.length - 1) {
            index++;
          }
          else if (!~index) {
            index = 0;
          }

          var $current = $items.eq(index);
          $current.focus();

          if (event.keyCode === 32 || event.keyCode === 13) {
            var $checkbox = $current.find('input');

            $checkbox.prop("checked", !$checkbox.prop("checked"));
            $checkbox.change();
          }

          event.stopPropagation();
          event.preventDefault();
        }
      }, this));
    },

    // Will build an dropdown element for the given option.
    createOptionValue: function(element) {
      var $li = $(this.templates.li);

      if($(element).data('divider'))
      {
        $li.addClass('divider');
        this.$ul.append($li);
        return;
      }


      if ($(element).is(':selected')) {
        $(element).prop('selected', true);
      }

      // Support the label attribute on options.
      var label = this.options.label(element);
      var value = $(element).val();
      var inputType = this.options.multiple ? "checkbox" : "radio";




      $('label', $li).addClass(inputType);
      //$li.addClass('divider');
      $('label', $li).append('<input type="' + inputType + '" />');

      var selected = $(element).prop('selected') || false;
      var $checkbox = $('input', $li);
      $checkbox.val(value);


      if (value === this.options.selectAllValue) {
        $checkbox.parent().parent()
          .addClass('multiselect-all');
      }
      $checkbox.attr('name', $(element).data('property')); //data('property', $(element).data('property') );

      $('label', $li).append(" " + label);

      this.$ul.append($li);

      if ($(element).is(':disabled')) {
        $checkbox.attr('disabled', 'disabled')
          .prop('disabled', true)
          .parents('li')
          .addClass('disabled');
      }

      $checkbox.prop('checked', selected);

      if (selected && this.options.selectedClass) {
        $checkbox.parents('li')
          .addClass(this.options.selectedClass);
      }
    },

    // Create optgroup.
    createOptgroup: function(group) {
      var groupName = $(group).prop('label');

      // Add a header for the group.
      var $li = $(this.templates.liGroup);
      $('label', $li).text(groupName);

      this.$ul.append($li);

      // Add the options of the group.
      $('option', group).each($.proxy(function(index, element) {
        this.createOptionValue(element);
      }, this));
    },

    // Add the select all option to the select.
    buildSelectAll: function() {
      var alreadyHasSelectAll = this.$select[0][0] ? this.$select[0][0].value === this.options.selectAllValue : false;

      // If options.includeSelectAllOption === true, add the include all checkbox.
      if (this.options.includeSelectAllOption && this.options.multiple && !alreadyHasSelectAll) {
        this.$select.prepend('<option value="' + this.options.selectAllValue + '">' + this.options.selectAllText + '</option>');
      }
    },

    // Build and bind filter.
    buildFilter: function() {

      // Build filter if filtering OR case insensitive filtering is enabled and the number of options exceeds (or equals) enableFilterLength.
      if (this.options.enableFiltering || this.options.enableCaseInsensitiveFiltering) {
        var enableFilterLength = Math.max(this.options.enableFiltering, this.options.enableCaseInsensitiveFiltering);

        if (this.$select.find('option').length >= enableFilterLength) {

          this.$filter = $(this.templates.filter);
          $('input', this.$filter).attr('placeholder', this.options.filterPlaceholder);
          this.$ul.prepend(this.$filter);

          this.$filter.val(this.query).on('click', function(event) {
            event.stopPropagation();
          }).on('keydown', $.proxy(function(event) {
            // This is useful to catch "keydown" events after the browser has updated the control.
            clearTimeout(this.searchTimeout);

            this.searchTimeout = this.asyncFunction($.proxy(function() {

              if (this.query !== event.target.value) {
                this.query = event.target.value;

                $.each($('li', this.$ul), $.proxy(function(index, element) {
                  var value = $('input', element).val();
                  var text = $('label', element).text();

                  if (value !== this.options.selectAllValue) {

                    // by default lets assume that element is not
                    // interesting for this search
                    var showElement = false;

                    var filterCandidate = '';
                    if ((this.options.filterBehavior === 'text' || this.options.filterBehavior === 'both')) {
                      filterCandidate = text;
                    }
                    if ((this.options.filterBehavior === 'value' || this.options.filterBehavior === 'both')) {
                      filterCandidate = value;
                    }

                    if (this.options.enableCaseInsensitiveFiltering && filterCandidate.toLowerCase().indexOf(this.query.toLowerCase()) > -1) {
                      showElement = true;
                    }
                    else if (filterCandidate.indexOf(this.query) > -1) {
                      showElement = true;
                    }

                    if (showElement) {
                      $(element).show();
                    }
                    else {
                      $(element).hide();
                    }
                  }
                }, this));
              }

              // TODO: check whether select all option needs to be updated.
            }, this), 300, this);
          }, this));
        }
      }
    },

    // Destroy - unbind - the plugin.
    destroy: function() {
      this.$container.remove();
      this.$select.show();
    },

    // Refreshs the checked options based on the current state of the select.
    refresh: function() {
      $('option', this.$select).each($.proxy(function(index, element) {
        var $input = $('li input', this.$ul).filter(function() {
          return $(this).val() === $(element).val();
        });

        if ($(element).is(':selected')) {
          $input.prop('checked', true);

          if (this.options.selectedClass) {
            $input.parents('li')
              .addClass(this.options.selectedClass);
          }
        }
        else {
          $input.prop('checked', false);

          if (this.options.selectedClass) {
            $input.parents('li')
              .removeClass(this.options.selectedClass);
          }
        }

        if ($(element).is(":disabled")) {
          $input.attr('disabled', 'disabled')
            .prop('disabled', true).parents('li')
            .addClass('disabled');
        }
        else {
          $input.removeAttr('disabled')
            .prop('disabled', false).parents('li')
            .removeClass('disabled');
        }
      }, this));

      this.updateButtonText();
    },

    // Select an option by its value or multiple options using an array of values.
    select: function(selectValues) {
      if(selectValues && !$.isArray(selectValues)) {
        selectValues = [selectValues];
      }

      for (var i = 0; i < selectValues.length; i++) {
        var value = selectValues[i];

        var $option = this.getOptionByValue(value);
        var $checkbox = this.getInputByValue(value);

        if (this.options.selectedClass) {
          $checkbox.parents('li')
            .addClass(this.options.selectedClass);
        }

        $checkbox.prop('checked', true);
        $option.prop('selected', true);
      }

      this.updateButtonText();
    },

    // Deselect an option by its value or using an array of values.
    deselect: function(deselectValues) {
      if(deselectValues && !$.isArray(deselectValues)) {
        deselectValues = [deselectValues];
      }

      for (var i = 0; i < deselectValues.length; i++) {
        var value = deselectValues[i];

        var $option = this.getOptionByValue(value);
        var $checkbox = this.getInputByValue(value);

        if (this.options.selectedClass) {
          $checkbox.parents('li')
            .removeClass(this.options.selectedClass);
        }

        $checkbox.prop('checked', false);

        $option.removeAttr('selected')
          .prop('selected', false);
      }

      this.updateButtonText();
    },

    // Rebuild the whole dropdown menu.
    rebuild: function() {
      this.$ul.html('');

      // Remove select all option in select.
      $('option[value="' + this.options.selectAllValue + '"]', this.$select).remove();

      // Important to distinguish between radios and checkboxes.
      this.options.multiple = this.$select.attr('multiple') === "multiple";

      this.buildSelectAll();
      this.buildDropdownOptions();
      this.updateButtonText();
      this.buildFilter();
    },

    // Build select using the given data as options.
    dataprovider: function(dataprovider) {
      var optionDOM = "";
      dataprovider.forEach(function (option) {
        optionDOM += '<option value="' + option.value + '">' + option.label + '</option>';
      });

      this.$select.html(optionDOM);
      this.rebuild();
    },

    // Enable button.
    enable: function() {
      this.$select.prop('disabled', false);
      this.$button.prop('disabled', false)
        .removeClass('disabled');
    },

    // Disable button.
    disable: function() {
      this.$select.prop('disabled', true);
      this.$button.prop('disabled', true)
        .addClass('disabled');
    },

    // Set options.
    setOptions: function(options) {
      this.options = this.mergeOptions(options);
    },

    // Get options by merging defaults and given options.
    mergeOptions: function(options) {
      return $.extend({}, this.defaults, options);
    },

    // Update button text and button title.
    updateButtonText: function() {
      var options = this.getSelected();

      // First update the displayed button text.
      $('button', this.$container).html(this.options.buttonText(options, this.$select));

      // Now update the title attribute of the button.
      $('button', this.$container).attr('title', this.options.buttonTitle(options, this.$select));

    },

    // Get all selected options.
    getSelected: function() {
      return $('option[value!="' + this.options.selectAllValue + '"]', this.$select).filter(function() {
        return $(this).prop('selected');
      });
    },

    // Get the corresponding option by ts value.
    getOptionByValue: function(value) {
      return $('option', this.$select).filter(function() {
        return $(this).val() === value;
      });
    },

    // Get an input in the dropdown by its value.
    getInputByValue: function(value) {
      return $('li input', this.$ul).filter(function() {
        return $(this).val() === value;
      });
    },

    updateOriginalOptions: function() {
      this.originalOptions = this.$select.clone()[0].options;
    },

    asyncFunction: function(callback, timeout, self) {
      var args = Array.prototype.slice.call(arguments, 3);
      return setTimeout(function() {
        callback.apply(self || window, args);
      }, timeout);
    }
  };

  $.fn.multiselect = function(option, parameter) {
    return this.each(function() {
      var data = $(this).data('multiselect');
      var options = typeof option === 'object' && option;

      // Initialize the multiselect.
      if (!data) {
        $(this).data('multiselect', ( data = new Multiselect(this, options)));
      }

      // Call multiselect method.
      if ( typeof option === 'string') {
        data[option](parameter);
      }
    });
  };

  $.fn.multiselect.Constructor = Multiselect;

  // Automatically init selects by their data-role.
  $(function() {
    $("select[data-role=multiselect]").multiselect();
  });

}(window.jQuery);
