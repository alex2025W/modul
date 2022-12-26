#!/usr/bin/python
# -*- coding: utf-8 -*-

from models import workordermodel, contractmodel, sectormodel, materialsgroupmodel, usermodel
from bson.objectid import ObjectId
import datetime


# получить остатки по всем платежам
# если opened_only=True, то выгружаются только открытиые договора
def get_finance(opened_only=False):

	result=[]
	filter = {'factory_id':ObjectId("5305d15472ab560009030c0e"),  'is_signed':'yes', '$or': [{ 'status': { '$ne': 'completed' } },  { 'status_date': { '$gt': datetime.datetime.now() - datetime.timedelta(days=30) } }]} if opened_only else {'is_signed':'yes'}
	

	for contract in contractmodel.get_list_by(filter,{'number':1,'factory':1,'payments':1, 'client_name':1, 'productions':1, 'parent_id':1, 'parent_number':1, 'is_canceled':1}):
		if not contract.get('is_canceled'):
			for pay in contract.get('payments',[]):				
				rest = pay.get('size')
				for event in pay.get('events',[]):
					if event.get('type') in ['additional_payment','fact_payment']:						
						rest-=event.get('size')
				# если у платежа нет 100% оплаты, выводим в таблицу
				if abs(rest)>0.001 and not pay.get('is_canceled'):
					order_number = ''
					# услуга
					if pay.get('payment_use',{}).get('code')==3:
						if not pay.get('by_service'):
							order_number=str(contract.get('number'))+".0.0"
						else:
							is_find = False
							for service in pay.get('services',[]):
								for production in contract.get('productions'):
									if production.get('product_type')=='service' and service.get('service_id')==production.get('_id'):
										order_number=str(contract.get('number'))+"."+str(production.get('number',0))+".1"
										is_find = True
										break
								if is_find:
									break
					else:
						if not pay.get('by_production'):
							order_number = str(contract.get('number'))+".0.0"
						else:
							#группируем юниты по продукции
							prod_gr = {}
							for u in pay.get('units'):
								pnumber = 0
								for p in contract.get('productions'):
									if p.get('_id')==u.get('production_id'):
										pnumber = p.get('number',0)
								if pnumber in prod_gr:
									prod_gr[pnumber].append(str(u.get('unit_number',0)))
								else:
									prod_gr[pnumber] = [str(u.get('unit_number',0))]

							for prod in prod_gr:
								if order_number!='':
									order_number+=', '
								order_number+= str(contract.get('number'))+'.'+str(prod)+'.'+('0' if (len(prod_gr[prod])>1) else str(prod_gr[prod][0]))

					start_date = pay.get("date")
					end_date = pay.get("date_end")

					if pay.get('work_order_id') and pay.get('work_id'):
						wo = workordermodel.get_by({'work_order_id':pay.get('work_order_id')},{'plan_work':1})
						if wo:
							for pwork in wo.get('plan_work',[]):
								if str(pwork.get('_id'))==str(pay.get('work_id')):
									start_date = work['contract_plan_date_start_with_shift'] or work['contract_plan_date_start'] or work['date_start_with_shift'] or work['date_start'] or start_date
									end_date = work['contract_plan_date_finish_with_shift'] or work['contract_plan_date_finish'] or work['date_finish_with_shift'] or work['date_finish'] or end_date
									break



					result.append({'factory':contract.get('factory',''),
								   'client': contract.get('client_name',''),
								   'contract_number': int(contract.get('number')) if not contract.get('parent_id') else (str(int(contract.get('parent_number',0)))),
								   'order_number': order_number,
								   'payment_use': pay.get('payment_use',{}).get('name'),
								   'payment_type': pay.get('payment_type',{}).get('name'),
								   'start_date': start_date,
								   'end_date': end_date,
								   'size': rest }) #pay.get('size')})

	return result