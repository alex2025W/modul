#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route #, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
from datetime import datetime, timedelta
from helpers.google_api import calendar
from config import db


# test calendar
# calendar_id = "fi5td1m9q9cr8svikj2oct7a0k@group.calendar.google.com"
# TODO: читать айдишник календаря из переменных окружения.
# os.environ.get('WEEKEND_CALENDAR')
calendar_id = "modul.org_7pqbpe5tiqrg7lmui9iamlulo0@group.calendar.google.com"

# отрезок дат, в пределах которого запрашиваются события из календаря
date_from = datetime(2012, 1,1)
date_to = datetime.now() + timedelta(days=365)


""" Сохраняет ивенты из гугло-календаря в базу """
@route('/weekends')
def weekends():
	# get data from google-calendar
	(events, updated) = get_events()

	# update DB if there are new data
	last_updated = (db.weekends.find_one({}, {'updated': 1}) or {}).get("updated", datetime.min)
	new_weekends = []
	if last_updated < updated:
		new_weekends = update_weekends(updated, events['items'])

	return renderHtml({
		"updated": updated,
		"last_updated": last_updated,
		"date_from": date_from,
		"date_to": date_to,
		"weekends_count": len(new_weekends)
		})

""" Вызывается раз в сутки из clock.py для записи событий из календаря в базу """
def do_sync():
	(events, updated) = get_events()
	update_weekends(updated, events['items'])

def get_events():
	events = calendar.get_events_by_date_range(calendar_id, date_from, date_to)
	updated = datetime.strptime(events['updated'].split('.')[0],'%Y-%m-%dT%H:%M:%S')
	return (events, updated)

def update_weekends(updated, weekends):
	new_weekends = []
	for weekend in weekends:
		day = datetime.strptime(weekend['start']['date'], '%Y-%m-%d')
		endOfWeekend = datetime.strptime(weekend['end']['date'], '%Y-%m-%d')
		while day < endOfWeekend:
			new_weekends.append(day.strftime('%Y-%m-%d'))
			day += timedelta(days=1)
	db.weekends.update({}, {"updated": updated, "weekends": new_weekends}, upsert=True)
	return new_weekends

def renderHtml(params):
	html = """
		<table>
			<tr>
				<td>Дата версии в базе</td><td>{0}</td>
			</tr>
			<tr>
				<td>Дата последних изменений в календаре</td><td>{1}</td>
			</tr>
		</table>
		""".format(params["last_updated"], params["updated"])

	if params["last_updated"] < params["updated"]:
		html += "<p>Данные в базе обновлены. С {0} по {1} в календаре {2} нерабочих дней</p>".format(
				str(params["date_from"])[0:10],
				str(params["date_to"])[0:10],
				len(params["new_weekends"]))
	else:
		html += "<p>Обновление данных не требуется<p>"

	html += """<iframe src="https://www.google.com/calendar/embed?showPrint=0&amp;showTabs=0&amp;showCalendars=0&amp;showTz=0&amp;height=500&amp;wkst=2&amp;hl=ru&amp;bgcolor=%23FFFFFF&amp;src={0}&amp;color=%2329527A&amp;ctz=Europe%2FMoscow"
			style=" border-width:0 " width="800" height="500" frameborder="0" scrolling="no"></iframe>
	""".format(calendar_id)
	return html

