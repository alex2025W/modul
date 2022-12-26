/* Script by http://linkorn.ru/ */

var linkornLibrary =
{
    CreateMethod: function (handler, method) {
        return function () {
            return method.apply(handler, arguments);
        }
    },

    // функция проверки на array
    is_array: function (mixed_var) {    // Finds whether a variable is an array
        return (mixed_var instanceof Array);
    },

    // генерирование случайного числа
    uniqid: function () {
        var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var string_length = 10;
        var randomstring = '';
        for (var x = 0; x < string_length; x++) {
            var letterOrNumber = Math.floor(Math.random() * 2);
            if (letterOrNumber == 0) {
                var newNum = Math.floor(Math.random() * 9);
                randomstring += newNum;
            } else {
                var rnum = Math.floor(Math.random() * chars.length);
                randomstring += chars.substring(rnum, rnum + 1);
            }
        }
        return randomstring;
    },

    // функция проверки корректности введенной даты
    isValidDateTime: function (date) {
        function parseDate(input, format) {
            format = format || 'dd/mm/yyyy h:i'; // default format
            var parts = input.match(/(\d+)/g),
              i = 0, fmt = {};
            // extract date-part indexes from the format
            format.replace(/(yyyy|dd|mm|h|i)/g, function (part) { fmt[part] = i++; });

            var dt = new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']], parts[fmt['h']], parts[fmt['i']]);

            if ((parts[fmt['dd']] == dt.getDate()) && (parts[fmt['mm']] - 1 == dt.getMonth()) && (parts[fmt['yyyy']] == dt.getFullYear()) && (parts[fmt['h']] == dt.getHours()) && (parts[fmt['i']] == dt.getMinutes()))
                return true;
            else
                return false;
        }

        tmp = parseDate(date);
        if (tmp && tmp != "Nan")
            return true;
        else
            return false;
    },

    // функция проверки корректности введенной даты
    isValidDate: function (date) {
        function parseDate(input, format) {
            format = format || 'dd/mm/yyyy'; // default format
            var parts = input.match(/(\d+)/g),
              i = 0, fmt = {};
            // extract date-part indexes from the format
            format.replace(/(yyyy|dd|mm)/g, function (part) { fmt[part] = i++; });

            var dt = new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']]);

            if ((parts[fmt['dd']] == dt.getDate()) && (parts[fmt['mm']] - 1 == dt.getMonth()) && (parts[fmt['yyyy']] == dt.getFullYear()))
                return true;
            else
                return false;
        }

        tmp = parseDate(date);
        if (tmp && tmp != "Nan")
            return true;
        else
            return false;
    },

    // функция проверки корректности емайл адреса
    isValidEmail: function (email) {
        return (/^([a-z0-9_\-]+\.)*[a-z0-9_\-]+@([a-z0-9][a-z0-9\-]*[a-z0-9]\.)+[a-z]{2,4}$/i).test(email);
    },

    // функция проверки корректности на латиницу
    isValidLatina: function (val) {
        return (/^[a-zA-Z0-9]+$/i).test(val);
    },

    // функция преобразования числа к формату 1 234 567 из 1234567
    numberFormat: function (_number, _cfg) {
        function obj_merge(obj_first, obj_second) {
            var obj_return = {};
            for (key in obj_first) {
                if (typeof obj_second[key] !== 'undefined') obj_return[key] = obj_second[key];
                else obj_return[key] = obj_first[key];
            }
            return obj_return;
        }

        function thousands_sep(_num, _sep) {
            if (_num.length <= 3) return _num;
            var _count = _num.length;
            var _num_parser = '';
            var _count_digits = 0;
            for (var _p = (_count - 1); _p >= 0; _p--) {
                var _num_digit = _num.substr(_p, 1);
                if (_count_digits % 3 == 0 && _count_digits != 0 && !isNaN(parseFloat(_num_digit))) _num_parser = _sep + _num_parser;
                _num_parser = _num_digit + _num_parser;
                _count_digits++;
            }
            return _num_parser;
        }

        if (typeof _number !== 'number') {
            _number = parseFloat(_number);
            if (isNaN(_number)) return false;
        }

        var _cfg_default = { before: '', after: '', decimals: 2, dec_point: '.', thousands_sep: ',' };
        if (_cfg && typeof _cfg === 'object') {
            _cfg = obj_merge(_cfg_default, _cfg);
        }

        else _cfg = _cfg_default;
        _number = _number.toFixed(_cfg.decimals);
        if (_number.indexOf('.') != -1) {
            var _number_arr = _number.split('.');
            var _number = thousands_sep(_number_arr[0], _cfg.thousands_sep) + _cfg.dec_point + _number_arr[1];
        }
        else var _number = thousands_sep(_number, _cfg.thousands_sep);
        return _cfg.before + _number + _cfg.after;
    },

    // функция удаления лишних пробелов из строки
    trimString: function (string) {
        return string.replace(/(^\s+)|(\s+$)/g, "");
    },

    // создать уникальный UID
    makeUID: function () {
        var dt = new Date();
        return (dt.getFullYear().toString() + dt.getMonth().toString() + dt.getDay().toString() + dt.getHours().toString() +
               +dt.getMinutes().toString() + dt.getSeconds().toString() + dt.getMilliseconds().toString());
    },

    // задать прозрачность
    SetOpacity: function (elem, value) {
        elem.style.filter = "progid:DXImageTransform.Microsoft.Alpha(style=0,opacity=" + value + ");";
        elem.style.opacity = value / 100;
        elem.style.mozOpacity = value / 100;
        elem.style.KhtmlOpacity = value / 100;
    },

    // найти элемент по его ID
    GetElement: function (elem_id) {
        if (document.layers)
            return document.layers[elem_id];
        else if (document.all)
            return document.all[elem_id];
        else if (document.getElementById)
            return document.getElementById(elem_id);
    },

    // отправить postback
    DoPostBack: function (target, argument) {
        var forms = document.getElementsByTagName("form");
        if (forms && forms.length > 0) {
            linkornLibrary.GetElement("__eventtarget").value = target;
            linkornLibrary.GetElement("__eventargument").value = argument;
            forms[0].submit();
        }
    }
}


// прелоадер для разных действий
var dxPercenter = function () {
    this.percenter = document.createElement("DIV");
    this.percenter.style.cssText = "position:absolute; left:0; top:0; display:none; background:#fff; z-index:100;";
    this.percenter.innerHTML = "<div style=\"margin:0;padding:0;width:120px; font-size:20px; height:32px;\"></div>";
    linkornLibrary.SetOpacity(this.percenter, 80);
}
dxPercenter.prototype = {
    Show: function (parent, percent) {
    try{
        parent.appendChild(this.percenter);
        this.percenter.style.width = parent.offsetWidth + "px";
        this.percenter.style.height = parent.offsetHeight + "px";
        // кутящийся индикатор размером 32 на 32
        // делаем его по центру
        var mt = (parent.offsetHeight - 32) / 2;
        var ml = (parent.offsetWidth - 120) / 2;
        // размеры прелоадера не могут быть меньше картинки
        if (mt < 0) {
            mt = 0;
            this.preloader.style.height = "32px";
        }
        if (ml < 0) {
            ml = 0;
            this.preloader.style.width = "120px";
        }

        var img = this.percenter.getElementsByTagName("DIV")[0];
        img.style.marginTop = mt + "px";
        img.style.marginLeft = ml + "px";
        img.innerHTML = percent;
        this.percenter.style.display = "block";
        }
        catch(e)
        {
        }
    },
    Hide: function () {
        this.percenter.style.display = "none";
        //$(this.black_ent_div).remove();
    }
}


// прелоадер для разных действий
var dxPreloader = function () {
    this.preloader = document.createElement("DIV");
    this.preloader.style.cssText = "position:absolute; left:0; top:0; display:none; background:#fff; z-index:1000;";
    this.preloader.innerHTML = "<img src=\"/internal/static/img/preloader_wh.gif\" style=\"margin:0;padding:0;width:32px; height:32px;\" />";
    linkornLibrary.SetOpacity(this.preloader, 50);
}
dxPreloader.prototype = {
    Show: function (parent) {
        parent.appendChild(this.preloader);
        this.preloader.style.width = parent.offsetWidth + "px";
        this.preloader.style.height = parent.offsetHeight + "px";
        // кутящийся индикатор размером 32 на 32
        // делаем его по центру
        var mt = (parent.offsetHeight - 32) / 2;
        var ml = (parent.offsetWidth - 32) / 2;
        // размеры прелоадера не могут быть меньше картинки
        if (mt < 0) {
            mt = 0;
            this.preloader.style.height = "32px";
        }
        if (ml < 0) {
            ml = 0;
            this.preloader.style.width = "32px";
        }

        var img = this.preloader.getElementsByTagName("IMG")[0];
        img.style.marginTop = mt + "px";
        img.style.marginLeft = ml + "px";
        this.preloader.style.display = "block";
    },
    Hide: function () {
        this.preloader.style.display = "none";
        //$(this.black_ent_div).remove();
    }
}

// маленький прелоадер для разных действий
var dxSmallPreloader = function () {
    this.preloader = document.createElement("DIV");
    this.preloader.style.cssText = "position:absolute; left:0; top:0; display:none; background:#fff; z-index:1000;";
    this.preloader.innerHTML = "<img src=\"/internal/static/img/preloadsm_wh.gif\" style=\"margin:0;padding:0;width:16px; height:16px;\" />";
    linkornLibrary.SetOpacity(this.preloader, 80);
}
dxSmallPreloader.prototype = {
    Show: function (parent) {
        parent.appendChild(this.preloader);
        this.preloader.style.width = parent.offsetWidth + "px";
        this.preloader.style.height = parent.offsetHeight + "px";
        // кутящийся индикатор размером 16 на 16
        // делаем его по центру
        var mt = (parent.offsetHeight - 16) / 2;
        var ml = (parent.offsetWidth - 16) / 2;
        // размеры прелоадера не могут быть меньше картинки
        if (mt < 0) {
            mt = 0;
            this.preloader.style.height = "16px";
        }
        if (ml < 0) {
            ml = 0;
            this.preloader.style.width = "16px";
        }
        var img = this.preloader.getElementsByTagName("IMG")[0];
        if (img) {
            img.style.marginTop = mt + "px";
            img.style.marginLeft = ml + "px";
        }
        this.preloader.style.display = "block";
    },
    Hide: function () {
        this.preloader.style.display = "none";
    }
}

// прозрачный слой перекрывающий все эелементы
var dxBackLayer = function () {
    this.preloader = document.createElement("DIV");
    this.preloader.style.cssText = "position:absolute; left:0; top:0; display:none; background:#fff; z-index:10000;";
    this.preloader.innerHTML = "&nbsp;";
    linkornLibrary.SetOpacity(this.preloader, 1);
}
dxBackLayer.prototype = {
    Show: function (parent) {
        parent.appendChild(this.preloader);
        this.preloader.style.width = parent.offsetWidth + "px";
        this.preloader.style.height = parent.offsetHeight + "px";
        this.preloader.style.display = "block";
    },
    Hide: function () {
        this.preloader.style.display = "none";
    }
}
