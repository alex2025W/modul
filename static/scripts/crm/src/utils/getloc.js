function getloc(dt){

  if (dt && moment(dt, 'DD.MM.YYYY HH:mm:ss').isValid()){
    dt = moment.utc(dt, 'DD.MM.YYYY HH:mm:ss').local().format('DD.MM.YYYY HH:mm:ss');
  }

  return dt;
}

module.exports = getloc;