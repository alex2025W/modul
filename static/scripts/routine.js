var Routine =
{
  /**
   * @desc Показать сообщение
   */
  showMessage: function(text, status, sticky, life){
    $.jGrowl(text, { 'themeState':'growl-' + status, 'sticky':sticky!=undefined?sticky:false, life: life!=undefined?life:10000, 'position': 'bottom-right' });
  },

  ///
  ///  Добавить указанное количество рабочих дней к дате
  ///
  add_work_days: function(date, count){
    var new_date = undefined;
    var i = 1;
    while (i <= count){
      new_date = date.add('d', 1);
      if (window.WEEKENDS.indexOf(new_date.format('YYYY-MM-DD')) > -1)
        count++;
      i++;
    }
    return new_date
  },

  //
  // Подпись к размеру
  //
  displaySize: function (bytes) {
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 B';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  },

  //
  // функция проверки на пустой объект
  //
  isEmpty:function (obj)
  {
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop))
        return false;
    }
    return true;
  },

  //
  // функция проверки корректности введенной даты
  //
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

  //
  // функция проверки корректности емайл адреса
  //
  isValidEmail: function (email) {
    return (/^([a-z0-9_\-]+\.)*[a-z0-9_\-]+@([a-z0-9][a-z0-9\-]*[a-z0-9]\.)+[a-z]{2,4}$/i).test(email);
  },

  isValidUrl: function(val)
  {
    if(val)
      return (/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+(:[0-9]+)?|(?:ww‌​w.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?‌​(?:[\w]*))?)/).test(val);
    return false;
  },

  //
  // функция копирования объекта
  //
  copyObject: function (val) {
    if(val)
      return JSON.parse(JSON.stringify(val));
    return null;
  },

  //
  // Функция преобразования строки к дате со временем
  //
   parseDateTime:function(input, format) {
    if(!input) return false;
    format = format || 'dd/mm/yyyy h:i'; // default format
    var parts = input.match(/(\d+)/g),
      i = 0, fmt = {};
    // extract date-part indexes from the format
    format.replace(/(yyyy|dd|mm|h|i|s)/g, function (part) { fmt[part] = i++; });

    var dt = new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']], parts[fmt['h']], parts[fmt['i']], parts[fmt['s']]);

    if ((parts[fmt['dd']] == dt.getDate()) && (parts[fmt['mm']] - 1 == dt.getMonth()) && (parts[fmt['yyyy']] == dt.getFullYear()) && (parts[fmt['h']] == dt.getHours()) && (parts[fmt['i']] == dt.getMinutes()) && (parts[fmt['s']] == dt.getSeconds()) )

        return dt;
    else
        return false;
   },

  //
  // функция преобразования строки к дате
  //
  parseDate:function(input, format) {
    if(!input) return false;
      format = format || 'dd/mm/yyyy'; // default format
      var parts = input.match(/(\d+)/g), i = 0, fmt = {};
      // extract date-part indexes from the format
      format.replace(/(yyyy|dd|mm)/g, function (part) { fmt[part] = i++; });
      var dt = new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']]);
      if ((parts[fmt['dd']] == dt.getDate()) && (parts[fmt['mm']] - 1 == dt.getMonth()) && (parts[fmt['yyyy']] == dt.getFullYear()) )
          return dt;
      else
          return false;
  },

   //
   // функция проверки корректности даты
   //
  isValidDate: function (date, format) {
    function parseDate(input, format) {
        format = format || 'dd/mm/yyyy'; // default format
        var parts = input.match(/(\d+)/g),
          i = 0, fmt = {};
        // extract date-part indexes from the format
        format.replace(/(yyyy|dd|mm)/g, function (part) { fmt[part] = i++; });

        var dt = new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']]);

        if ((parts[fmt['dd']] == dt.getDate()) && (parts[fmt['mm']] - 1 == dt.getMonth()) && (parts[fmt['yyyy']] == dt.getFullYear()) )
            return true;
        else
            return false;
    }
    var tmp = parseDate(date, format);
    if (tmp && tmp != "Nan")
        return true;
    else
        return false;
  },

   //
   //Конвертация строковой даты из формата dd/mm/yyyy в yyyy/mm/dd
   //
   prepareDate: function(strDate)
   {
    if(strDate!="")
    {
      var dateParts = strDate.split("/");
      return dateParts[2]+"/"+(dateParts[1]) +"/"+ dateParts[0];
    }
    return "";
   },

   //
   // Получение Array заполненого числами по заданному диапазону
   //
   range:function(start, end)
   {
      var foo = [];
      for (var i = start; i <= end; i++) {
          foo.push(i);
      }
      return foo;
  },

   //
   // Получение списка годов
   // start - количество годов которые необходимо отнять от текущего
   // end - количество годов которые необходимо прибавить к текущему
   //
   getRangeYears: function(start, end)
   {
      var curYear = new Date().getFullYear();
      var startYear = curYear - start;
      var endYear = curYear + end;
      return Routine.range(startYear, endYear);
   },

   //
   // Список дат между двумя датами
   //
   getListOfDatesBetweenTwoDates: function(startDate, endDate){
      return moment.range(startDate, endDate)
   },

   // Returns an array of dates between the two dates
   enumerateDaysBetweenDates: function(startDate, endDate) {
    startDate = moment(startDate);
    endDate = moment(endDate);

    var now = startDate, dates = [];

    while (now.isBefore(endDate) || now.isSame(endDate)) {
        //dates.push(now.format('YYYY-MM-DD'));
        dates.push(now.clone());
        now.add(1, 'days');
    }
    return dates;
  },

    //
    // Конвертация даты к UTC
    //
   convertToUTC: function(val)
   {
      return new Date(val.getTime() + val.getTimezoneOffset()*60000 );
   },

   //
   // Разница между двумя датами в днях
   //
   daysDiff : function(date1, date2, exact_match)
   {
      if(date1 && date2)
      {
          var timeDiff = date1.getTime() - date2.getTime();
          var tmpDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
          return tmpDays;
      }
      return 0;
   },

  //
  //  Преобразрвание даты к локальной
  // Требуется библиоткеа  - moment.js
  //
  convertDateToLocalTime: function(dt){
    if (dt && moment(dt, 'YYYY-MM-DD HH:mm:ss').isValid()){
      dt = moment.utc(dt, 'YYYY-MM-DD HH:mm:ss').local().format('DD.MM.YYYY HH:mm');
    }
    return dt;
  },

   //
   // преобразование даты в строку с заменой на вчера, сегодня, завтра
   // работает вместе с библиотекой moment.js
   // dt - строка в формате  DD.MM.YYYY HH:mm:ss
   // изначально даты переводятся ко времени 00:00:00
   //
   smartDateStr: function(dt)
   {
        var format = '';
        var time = '';
        if (dt && moment(dt, 'DD.MM.YYYY HH:mm:ss').isValid()){
          format = 'DD.MM.YYYY HH:mm:ss';
          time = ' ' + ((dt.length < 12 || moment.utc(dt, format).local().format('HH:mm:ss') =='00:00:00' )?'':moment.utc(dt, format).local().format('HH:mm:ss'));
        } else if (dt && moment(dt, 'DD.MM.YYYY').isValid()){
          format = 'DD.MM.YYYY';
        }
        if (format){
            var o_date = moment.utc(dt, format).local().startOf('day');
            var cur_date = moment().startOf('day');
            var days_count = cur_date.diff(o_date, 'days');
            switch (days_count){
               case 1:
                   return "Вчера" + time;
               case 0:
                   return "Сегодня" + time;
               case -1:
                   return "Завтра" + time;
               default :
                   return (dt.length < 12) ? dt : moment.utc(dt, format).local().format(format);
            }
        }
        return dt;
   },

   //
   // обнуление времени в дате
   //
   timeToZero: function(val)
   {
      val = new Date(val.setHours(0));
      val = new Date(val.setMinutes(0));
      val = new Date(val.setSeconds(0));
      val = new Date(val.setMilliseconds(0));
      return val;
   },

   //
   // Преобразрвание сторки в целое число
   //
   strToInt: function(str)
   {
      try
      {
        str = str.toString().replace(/ /g,'').replace(',','.').replace(' ', '');
        var tmp = parseInt(str);
        if (tmp && !isNaN(tmp))
              return tmp;
        else
              return 0;
      }
      catch(e){return 0;}
   },

   //
   //Удаление всех пробелов в строке
   //
   removeAllSpaces: function(str)
   {
      try{return str.replace(/ /g,'');}
      catch(e){return "";}
   },
   //
   // Преобразрвание сторки в вещественное число
   //
   strToFloat: function(str)
   {
    try{
        str = str.toString().replace(/ /g,'').replace(',','.').replace(' ', '');
        var tmp = parseFloat(str);
        if (tmp && !isNaN(tmp))
          return tmp;
        else
          return 0;
      }
      catch(e){return 0;}
   },

    //
    // Преобразование цены в строку
    //
    priceToStr: function(val, default_val, separator){
        separator = separator || ' ';
        default_val = default_val || '';
        default_val = default_val?default_val:0;
        return val?Routine.floatToStr($.number( val, 2, ',', separator?separator:'' )):default_val;
    },

   //
   // Проверка строки на число
   //
   isDiggit: function(str)
   {
      try
      {
          str = str.toString().replace(/ /g,'').replace(',','.');
          var tmp = parseFloat(str);
          if (tmp && !isNaN(tmp))
                return true;
          return false;
      }
      catch(e){return false;}
   },

   //
   // Преобразрвание числа к строке
   //
   floatToStr: function(val)
   {
      try{return val.toString().replace('.',',');}
      catch(e){return "";}
   },

   //
   // Округление до сотых
   //
   roundToHundredths: function(val)
   {
      return Math.round((val)*100)/100;
   },

   //
   // Разбиение тысячных в  строке
   //
   addCommas: function(nStr, separator)
   {
       var result = "";
       nStr += '';
       if(Routine.isDiggit(nStr))
       {
         var x = Routine.removeAllSpaces(nStr).replace(/ /g,'').replace(',','.').split('.');
         var x1 = x[0];
         var x2 = x.length > 1 ? '.' + x[1] : '';
         //var x2 = x[1];
         var rgx = /(\d+)(\d{3})/;
         while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + separator + '$2');
         }
         var tmpX2 = Routine.strToFloat(x2);
         if(tmpX2>0)
            result = x1 + tmpX2.toString().substr(1).replace('.', ',');
          else
            result = x1;
          return result;
      }
      return nStr;
    },
  //
   // Разбиение тысячных в  строке
   //
   toMoneyStr: function(nStr)
   {
     if(nStr && nStr.split(',').length>1 && nStr.split(',')[1].length==1)
        nStr+='0';
     return nStr;
    },

  //
  // Функция отображения заднего фона
  //
  showBackLayer:function(){
    $.blockUI({bindEvents:false,  'message':'', 'css':{'border':'none', 'backgroundColor':'transparent' ,'z-index':1001}, 'overlayCSS':{'backgroundColor':'#000', 'cursor':'pointer','z-index':1000 }});
  },

  //
   // Функция сокрытия заднего фона
   //
  hideBackLayer:function(){
    $.unblockUI();
  },

   //
   // Функция отображения прелоадера на форме
   //
  showLoader:function(){
    $.blockUI({ 'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent' ,'z-index':10001}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer','z-index':10000 }});
  },

   //
   // Функция отображения прогресса на форме
   //
  showProgressLoader:function(value){
    value = value || 10;
    if($('.progress').length>0)
        $('.progress>.bar ').css( "width", value.toString()+'%' );
    else
      $.blockUI({'message':'<div class="progress progress-striped active"><div class="bar" style="width: '+value.toString()+'%;"></div></div>', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
  },

   //
   // Функция сокрытия прелоадера на форме
   //
  hideLoader:function(){
    $.unblockUI();
  },

  //
  // Функция склонения чисел
  //
  declOfNum:function(number, titles)
  {
    cases = [2, 0, 1, 1, 1, 2];
    return titles[ (number%100>4 && number%100<20)? 2 : cases[(number%10<5)?number%10:5] ];
  },

  //
  // Функция склонения дней
  //
  declOfDays:function(value)
  {
    return Routine.declOfNum(value, ['день', 'дня', 'дней']);
  },

  //
  // склоняет слово в зависимости от числа
  //
  Declension:function(num,expressions){
    if(expressions.length<3)
      expressions[2] = expressions[1];
        var count = num % 100;
        var result = "";
        if (count >= 5 && count <= 20) {
            result = expressions[2];
        } else {
            count = count % 10;
            if (count == 1) {
                result = expressions[0];
            } else if (count >= 2 && count <= 4) {
                result = expressions[1];
            } else {
                result = expressions[2];
            }
        }
        return result;
  },

  //
  // Удаление лишних пробелов а также пробелов в начале и конце строки
  //
  trim: function(str) {
    if(str)
      return str.replace(/^\s+|\s+$/g,"").replace(/^\s*|\s*$/,'').replace(/\s+/g," ");
    return '';
  },

  leftTrim: function(str) {
    if(str)
      return str.replace(/^\s+/,"");
    return '';
  },

  rightTrim: function(str) {
    if(str)
      return str.replace(/^\s\s*/, '');
    return '';
  },

   //
   // Идентичность двух листов
   //
   arraysIdentical: function(a, b) {
      var i = a.length;
      if (i != b.length) return false;
      while (i--) {
          for(var key in a[i])
            if(a[i][key]!=b[i][key])
                return false;
      }
      return true;
  },

  ///
  ///
  ///
  rNToBr: function(str)
  {
      try
      {
        str = str.replace(/\n/g, "<br />");
        str = str.replace(/\r\n/g, "<br />");
      }
      catch(e){}
      return str;
  },
  removeRN: function(str)
  {
      try
      {
        str = str.replace(/\n/g, "");
        str = str.replace(/\r\n/g, "");
      }
      catch(e){}
      return str;
  },

  brToRn: function(str)
  {
      try
      {
        str = str.replace(/<br *\/?>/gi, "\n");
      }
      catch(e){}
      return str;
  },

  stripTags: function(str)
  {
    if(str)
      str=str.toString().replace(/&/g, '&amp;')
                .replace(/>/g, '&gt;')
                .replace(/</g, '&lt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
    return str;
  },

  toggleFullScreen: function()
  {
    if ((document.fullScreenElement && document.fullScreenElement !== null) ||
     (!document.mozFullScreen && !document.webkitIsFullScreen)) {
      if (document.documentElement.requestFullScreen) {
        document.documentElement.requestFullScreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullScreen) {
        document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    } else {
      if (document.cancelFullScreen) {
        document.cancelFullScreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
    }
  },

  ///
  /// Приведение секунд в минуты
  ///
  secondsToMinutes: function(val)
  {
      try{return parseFloat(val)/60;}
      catch(e){}
      return 0;
  },

  ///
  /// Приведение секунд в часы
  ///
  secondsToHours: function(val)
  {
      try{return parseFloat(val)/3600;}
      catch(e){}
      return 0;
  },

  /*
   *
   */
  pad: function(num) {
    return ("0"+num).slice(-2);
  },

  /*
   *
   */
  hhmmss: function(secs) {
    var minutes = secs / 60;
    secs = secs%60;
    var hours = Math.floor(minutes/60)
    minutes = minutes%60;
    return this.pad(hours)+":"+this.pad(Math.round(minutes));
  },

  /*
   *
   */
  getAllMatches: function(regex, text) {
    if (regex.constructor !== RegExp)
        throw new Error('not RegExp');
    var res = [];
    var match = null;
    if (regex.global) {
        while (match = regex.exec(text))
            res.push(match);
    }
    else {
        if (match = regex.exec(text))
            res.push(match);
    }
    return res;
  },

  /*
   * Форматирование строки типа - +[Елена_Михайленко|56123803afe13b00036f6e7d]  в ссылку
   */
  commentFormat:function(str){
    return str?str.replace(/\B\+\[([\wА-Яа-я]+)\|([\wА-Яа-я]+)\]/g,function(match,tag,char){
      return '<a href="/client-card/'+char+'#'+tag.replace(new RegExp('_','g'),' ')+' " target="_blank">'+tag.replace(new RegExp('_','g'),' ')+'</a>';
    }).//replace(/\B\+\[([\wА-Яа-я]+)\|([\wА-Яа-я]+)\|([\wА-Яа-я]+)\]/g,function(match,tag,char,type){
      replace(/\B\+\[([^|\]]+)\|([\wА-Яа-я]+)\|([\w]+)\]/g,function(match,tag,char,type){
      switch(type){
        case 'contact':
          return '<a href="/client-card/'+char+'#'+tag.replace(new RegExp('_','g'),' ')+' " target="_blank">'+tag.replace(new RegExp('_','g'),' ')+'</a>';
        case 'order':
          return '<a href="/crm/'+tag+'" target="_blank">'+tag.replace(new RegExp('_','g'),' ')+'</a>';
        case 'project':
          return '<a href="/projects#search/'+char+'" target="_blank">'+tag.replace(new RegExp('_','g'),' ')+'</a>';
        case 'client':
          return '<a href="/client-card/'+char+'" target="_blank">'+tag.replace(new RegExp('_','g'),' ')+'</a>';
      }
      return tag;
      //return '<a href="/client-card/'+char+'#'+tag.replace(new RegExp('_','g'),' ')+' " target="_blank">'+tag.replace(new RegExp('_','g'),' ')+'</a>';
    }):"";

  },

  /*
   * Преобразование телефона к формату : 89635698956
   */
  convertPhone: function(ph){
    ph = ph.replace(/[^\/\d]/g,'');
    if(ph[0]=='+')
      ph = ph.slice(1);
    if(ph.length == 11 && ph[0] == '7')
      ph = '8'+ph.slice(1);
    if(ph.length == 10)
      ph = '8'+ph;
    if(ph[0] == '7')
      ph = '8'+ph.slice(1);
    // обрезаем телефон до 11 значного
    if(ph.length>11)
      ph = ph.substr(0,11);
    return ph
  },

  /*
   * Глубокое клонирование объекта
   */
  deepClone: function(obj){
    return JSON.parse(JSON.stringify(obj, function(key, value) {
      if(key == 'parent')
        return null;
      return value;
    }));
  },

  /*
   * преобразовать дату с чуетом таймзоны
   */
  convertStrToDateWithTimezone:function(str){
    if(str.indexOf("Z")>0 || str.indexOf("+")>0)
      return new Date(str);
    return new Date(str+"Z");
  },

  /*
   * Очистить все символы кроме букв и цифр
   */
  clearWasteSymbols: function(str){
    return str.replace(/[^a-zA-Zа-яА-Я0-9]+/g, '').toLowerCase();
  },

  /*
   * Encode string by deflate
   */
  zipStr: function(val){
    return Base64.toBase64(RawDeflateStr.deflate(Base64.utob(val)));
  },

  /*
   * Decode string by deflate
   */
  unzipStr: function(val){
    var res = Base64.btou(RawDeflate.inflate(Base64.fromBase64(val)));
    return res || val;
  },

  /**
   * Prepare string to regexp
   */
  regEscape: function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  },

  isStringContains(string, q){
    var substrRegex = new RegExp(this.regEscape(q), 'i');
    return substrRegex.test(string);
  }

};

///
///Класс для генерации GUID
///
var Guid = Guid || (function () {
  var EMPTY = '00000000-0000-0000-0000-000000000000';
  var _padLeft = function (paddingString, width, replacementChar) {
    return paddingString.length >= width ? paddingString : _padLeft(replacementChar + paddingString, width, replacementChar || ' ');
  };

  var _s4 = function (number) {
    var hexadecimalResult = number.toString(16);
    return _padLeft(hexadecimalResult, 4, '0');
  };

  var _guid = function () {
    var currentDateMilliseconds = new Date().getTime();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (currentChar) {
      var randomChar = (currentDateMilliseconds + Math.random() * 16) % 16 | 0;
      currentDateMilliseconds = Math.floor(currentDateMilliseconds / 16);
      return (currentChar === 'x' ? randomChar : (randomChar & 0x7 | 0x8)).toString(16);
    });
  };

  var create = function () {
    return _guid();
  };

  return {
    newGuid: create,
    empty: EMPTY
  };
})();

