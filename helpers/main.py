# coding=utf-8

from typing import Union


def decode_order_status(status_id):
    # type: (str) -> Union[str, None]
    """
    Decodes uniq order status ID to human-readable text

    :param status_id: str
    :return:
    """

    # hardcoded order statuses from "int" project
    return dict({
        '51ed3f5f8fe17600027069b3': u"Подготовка договора",
        '51ed3f698fe17600027069b4': u"Согласование договора",
        '51ed3f738fe17600027069b5': u"Договор подписан",
        '51ed76b62d2e2300025c34b8': u"Интерес",
        '51ed76be2d2e2300025c34b9': u"Озвучили цену",
        '51ed76ca2d2e2300025c34ba': u"Уточнение ТЗ",
        '51ed76d62d2e2300025c34bb': u"Запрос КП",
        '51ed76db2d2e2300025c34bc': u"Подготовка КП",
        '51ed76df2d2e2300025c34bd': u"Отправили КП",
        '51ed76e42d2e2300025c34be': u"Согласование КП",
        '51ed76ea2d2e2300025c34bf': u"Рассматривают",
        '51ed76f32d2e2300025c34c0': u"Спящий",
        '51ed77072d2e2300025c34c1': u"Отказ",
        '549bee7e03de9e0003c2dbdc': u"Договор на подписании",
        '5638bfc02ad7aa000349da6c': u"Не дозвонились",
        '593aa58dfc9a69000878d728': u"Индикатор КП",
        '59834d91af9e820008782792': u"Квалификация",
        '59936cb66616bc0008fba663': u"Техническая консультация",
    }).get(status_id, None)
