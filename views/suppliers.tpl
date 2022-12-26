% def scripts():
    <script data-main="static/scripts/suppliers" src="static/scripts/libs/require.js?v={{version}}"></script>
    <link href="/static/css/supply.css?v={{version}}" rel="stylesheet" media="screen">
% end

% rebase master_page/base page_title='Поставщики', current_user=current_user, version=version, scripts=scripts, menu=menu

<hr class="header-divider"/>

<div id="app" class="span7">
</div>

<script id="gotoParentTemplate" type="text/template">
<a class="navi" href="<%= url %>">
    <i class="fa fa-caret-left"></i>
    <span>Назад</span>
</a>
</script>

<script id="suppliersListTemplate" type="text/template">
    <a id="new_supplier" class="add-item" href="#"
        data-title="Добавить поставщика"
        data-add-title="Добавить поставщика «<strong>%query%</strong>»">Добавить поставщика</a>

    <!-- backbone view SuppliersListView -->
    <table id="supplier-list" class="table table-striped">
        <thead>
            <th>Поставщик</th>
            <th>Активно</th>
        </thead>
        <tbody>
            <!-- backbone views SupplierView -->
        </tbody>
    </table>
</script>


<script id="supplierItemTemplate" type="text/template">
	<td>
        <a href="#/edit/<%= id %>"><%= name %></a>
    </td>
	<td>
        <label class="checkbox">
            <input type="checkbox" <%= enabled ? 'checked="checked"' : '' %> />
        </label>
    </td>
</script>


<script id="supplierFormTemplate" type="text/template">
    <form class="supplier-form form-inline">
        <fieldset>
            <div class="control-group">
                <input class="name span7" id="name" name="name" type="text" value="<%= name %>" placeholder="Введите название поставщика" />
                <span class="help-inline">Пожалуйста, введите название поставщика</span>
            </div>
        </fieldset>

        <button id="edit-goods" class="btn <%= isNew ? 'disabled' : '' %>" <%= isNew ? 'disabled="disabled"' : '' %>>Список товаров поставщика</button>

        <div class="control-group enabled-status">
            <label class="checkbox">
                <input type="checkbox" name="enabled" <%= enabled ? 'checked="checked"' : '' %>>Активно
            </label>
        </div>
        <div class="form-actions">
            <a href="/suppliers" class="btn btn-link">Отмена</a>
            <button type="submit" class="btn btn-primary">
                <% if (isNew) { %>
                    Добавить поставщика
                <% } else { %>
                    Сохранить
                <% } %>
            </button>
        </div>
    </form>
</script>


<script id="goodsListTemplate" type="text/template">
    <legend><a href="/suppliers#/edit/<%= id %>"><%= name %></a></legend>
    <a id="new_good" class="add-item" href="#"
        data-href="#/edit/<%= id %>/goods/new"
        data-title="Добавить товар"
        data-add-title="Добавить товар «<strong>%query%</strong>»">Добавить товар</a>

    <!-- backbone view GoodsListView -->
    <table id="good-list" class="table table-striped">
        <thead>
            <th class="numeric">Код</th>
            <th class="numeric">Код п.</th>
            <th>Название товара</th>
            <th class="numeric">Цена</th>
            <th>Активно</th>
        </thead>
        <tbody>
            <!-- backbone views goodView -->
        </tbody>
    </table>
</script>

<script id="goodItemTemplate" type="text/template">
	<td>
        <%= good.code %>
    </td>
    <td>
        <%= good.supplier_code %>
    </td>
	<td>
        <a href="#/edit/<%= supplier_id %>/goods/edit/<%= good.code %>"><%= good.name %></a>
    </td>
	<td>
        <div>
            <%= good.retail_delivery.price ? good.retail_delivery.price.toFixed(2) : "—" %>
        </div>
        <div>
            <%= good.sale_delivery.price ? good.sale_delivery.price.toFixed(2) : "—" %>
        </div>
    </td>
	<td>
        <label class="checkbox">
            <input type="checkbox" data-code="<%= good.code %>" <%= good.enabled ? 'checked="checked"' : '' %> />
        </label>
    </td>
</script>


<script id="goodFormTemplate" type="text/template">
    <form class="good-form form-inline">
        <fieldset>
            <div class="control-group">
                    <input class="name span7" id="name" name="name" type="text" value="<%= name %>" placeholder="Введите название товара" />
                <% if (isNew) { %>
                <% } else { %>
                    <label class="code text inline-control-label">код: <input tabindex="-1" class="span1" type="text" value="<%= code %>" readonly/></label>
                <% } %>
                <span class="help-block">Пожалуйста, введите название товара</span>
            </div>

            <div class="control-group">
                <label class="control-label" for="manufactor">Производитель</label>
                <div class="controls">
                    <input class="span7" id="manufactor" name="manufactor" type="text" value="<%= manufactor %>" placeholder="Введите название производителя" />
                    <span class="help-block">Пожалуйста, введите название производителя</span>
                </div>
            </div>

            <div class="control-group">
                <label class="control-label" for="sku">Единица складского хранения <abbr title="Обязательно к заполнению">*</abbr></label>
                <div class="controls">
                    <input class="span4" id="sku" name="sku" type="text" value="<%= sku %>" placeholder="штука, рулон, м, м2, кг и т.д." />
                    <span class="help-block">Пожалуйста, введите единицу складского учёта</span>
                </div>
            </div>
            <div class="control-group">
                <label class="control-label" for="supplier_code">Код товара у поставщика</label>
                <div class="controls">
                    <input class="span4" id="supplier_code" name="supplier_code" type="text" value="<%= supplier_code %>" placeholder="Введите код товара у поставщика" />
                    <span class="help-block">Пожалуйста, введите код товара у поставщика</span>
                </div>
            </div>

            <div class="control-group retail_delivery">
                <fieldset class="delivery" <%= retail_delivery.enabled ? "" : "disabled" %>>
                    <legend>
                        <label class="checkbox">
                            <input class="fieldset-switch" type="checkbox" name="retail_delivery[enabled]" <%= retail_delivery.enabled ? "checked" : "" %>> Розница
                        </label>
                    </legend>
                    <div class="control-group">
                        <label class="control-label" for="retail_delivery.size">Объём поставки <abbr title="Обязательно к заполнению">*</abbr></label>
                        <label class="text inline-control-label">
                            Количество:
                            <input class="span1" id="retail_delivery.size" name="retail_delivery[size]" type="number" step="any" min="0" value="<%= retail_delivery.size %>" />
                        </label>
                        <label class="text inline-control-label">
                            единица измерения:
                            <input class="span1" id="retail_delivery.unit" name="retail_delivery[unit]" type="text" value="<%= retail_delivery.unit %>" />
                        </label>
                        <span class="help-block">Пожалуйста, введите розничный объём и единицу измерения</span>
                    </div>

                    <div class="control-group">
                        <label class="control-label" for="retail_delivery.price">Цена за объём <abbr title="Обязательно к заполнению">*</abbr></label>
                        <input class="span2" id="retail_delivery.price" name="retail_delivery[price]" type="number" step="any" min="0" value="<%= retail_delivery.price %>" placeholder="" />
                        <label class="checkbox"> <input type="checkbox" name="retail_delivery[price_vat]" <%= retail_delivery.price_vat ? "checked" : "" %>> с НДС </label>
                        <span class="help-block">Пожалуйста, введите цену</span>
                    </div>

                    <div class="control-group">
                        <label class="control-label" for="retail_delivery.price_expiry_date">Цена действительна до <abbr title="Обязательно к заполнению">*</abbr></label>
                        <div class="input-append date datepicker" data-date="<%= retail_delivery.price_expiry_date %>" data-date-format="dd.mm.yyyy">
                            <input class="span2" id="retail_delivery.price_expiry_date" name="retail_delivery[price_expiry_date]" size="16" type="text"
                                    value="<%= retail_delivery.price_expiry_date %>" readonly />
                            <span class="add-on"><i class="icon-calendar"></i></span>
                        </div>
                    </div>
                    <fieldset class="delivery" <%= retail_delivery.delivery.enabled ? "" : "disabled" %>>
                        <legend>
                            <label class="checkbox">
                                <input type="checkbox" class="fieldset-switch" name="retail_delivery[delivery][enabled]" <%= retail_delivery.delivery.enabled ? "checked" : "" %> /> Доставка
                            </label>
                        </legend>
                        <div class="control-group">
                            <label class="control-label" for="retail_delivery.delivery.time_min">Срок поставки <abbr title="Обязательно к заполнению">*</abbr></label>
                            <label class="text inline-control-label">
                                от <input id="retail_delivery.delivery.time_min" name="retail_delivery[delivery][time_min]" type="number" min="0" class="span1"
                                        value="<%= retail_delivery.delivery.time_min %>" />
                            </label>
                            <label class="text inline-control-label">
                                до <input id="retail_delivery.delivery.time_max" name="retail_delivery[delivery][time_max]" type="number" min="0" class="span1 pluralize-it"
                                        value="<%= retail_delivery.delivery.time_max %>" />
                                <span>дней</span>
                            </label>
                            <span class="help-block">Пожалуйста, введите сроки поставки (в рабочих днях)</span>
                        </div>

                        <div class="control-group">
                            <label class="control-label" for="retail_delivery.delivery.cost">Стоимость</label>
                            <input class="span2" id="retail_delivery.delivery.cost" name="retail_delivery[delivery][cost]" type="number" step="any" min="0"
                                    value="<%= retail_delivery.delivery.cost %>" />
                            <span class="help-block">Пожалуйста, введите стоимость поставки</span>
                        </div>
                    </fieldset>
                </fieldset>
            </div> <!-- retail_delivery -->

            <div class="control-group sale_delivery">
                <fieldset class="delivery" <%= sale_delivery.enabled ? "" : "disabled" %>>
                    <legend>
                        <label class="checkbox">
                            <input class="fieldset-switch" type="checkbox" name="sale_delivery[enabled]" <%= sale_delivery.enabled ? "checked" : "" %>> Опт
                        </label>
                    </legend>
                    <div class="control-group">
                        <label class="control-label" for="sale_delivery.size">Объём поставки <abbr title="Обязательно к заполнению">*</abbr></label>
                        <label class="text inline-control-label">
                            Количество:
                            <input class="span1" id="sale_delivery.size" name="sale_delivery[size]" type="number" step="any" min="0" value="<%= sale_delivery.size %>" />
                        </label>
                        <label class="text inline-control-label">
                            единица измерения:
                            <input class="span1" id="sale_delivery.unit" name="sale_delivery[unit]" type="text" value="<%= sale_delivery.unit %>" />
                        </label>
                        <span class="help-block">Пожалуйста, введите оптовый объём и единицу измерения</span>
                    </div>

                    <div class="control-group">
                        <label class="control-label" for="sale_delivery.price">Цена за объём <abbr title="Обязательно к заполнению">*</abbr></label>
                        <input class="span2" id="sale_delivery.price" name="sale_delivery[price]" type="number" step="any" min="0" value="<%= sale_delivery.price %>" placeholder="" />
                        <label class="checkbox"> <input type="checkbox" name="sale_delivery[price_vat]" <%= sale_delivery.price_vat ? "checked" : "" %>> с НДС </label>
                        <span class="help-block">Пожалуйста, введите цену</span>
                    </div>

                    <div class="control-group">
                        <label class="control-label" for="sale_delivery.price_expiry_date">Цена действительна до <abbr title="Обязательно к заполнению">*</abbr></label>
                        <div class="input-append date datepicker" data-date="<%= sale_delivery.price_expiry_date %>" data-date-format="dd.mm.yyyy">
                            <input class="span2" id="sale_delivery.price_expiry_date" name="sale_delivery[price_expiry_date]" size="16" type="text"
                                    value="<%= sale_delivery.price_expiry_date %>" readonly />
                            <span class="add-on"><i class="icon-calendar"></i></span>
                        </div>
                    </div>
                    <fieldset class="delivery" <%= sale_delivery.delivery.enabled ? "" : "disabled" %>>
                        <legend>
                            <label class="checkbox">
                                <input type="checkbox" class="fieldset-switch" name="sale_delivery[delivery][enabled]" <%= sale_delivery.delivery.enabled ? "checked" : "" %> /> Доставка
                            </label>
                        </legend>
                        <div class="control-group">
                            <label class="control-label" for="sale_delivery.delivery.time_min">Срок поставки <abbr title="Обязательно к заполнению">*</abbr></label>
                            <label class="text inline-control-label">
                                от <input id="sale_delivery.delivery.time_min" name="sale_delivery[delivery][time_min]" type="number" min="0" class="span1"
                                        value="<%= sale_delivery.delivery.time_min %>" />
                            </label>
                            <label class="text inline-control-label">
                                до <input id="sale_delivery.delivery.time_max" name="sale_delivery[delivery][time_max]" type="number" min="0" class="span1 pluralize-it"
                                        value="<%= sale_delivery.delivery.time_max %>" />
                                <span>дней</span>
                            </label>
                            <span class="help-block">Пожалуйста, введите сроки поставки (в рабочих днях)</span>
                        </div>

                        <div class="control-group">
                            <label class="control-label" for="sale_delivery.delivery.cost">Стоимость</label>
                            <input class="span2" id="sale_delivery.delivery.cost" name="sale_delivery[delivery][cost]" type="number" step="any" min="0"
                                    value="<%= sale_delivery.delivery.cost %>" />
                            <span class="help-block">Пожалуйста, введите стоимость поставки</span>
                        </div>
                    </fieldset>
                </fieldset>
            </div> <!-- sale_delivery -->
            <div class="control-group">
                <label class="control-label" for="note">Примечание</label>
                <div class="controls">
                    <textarea class="span7" id="note" name="note" placeholder="Введите примечание к товару"><%= note %></textarea>
                </div>
            </div>
        </fieldset>


        <div class="control-group enabled-status">
            <label class="checkbox">
                <input type="checkbox" name="enabled" <%= enabled ? 'checked="checked"' : '' %>>Активно
            </label>
        </div>
        <div class="form-actions">
            <a href="#/edit/<%= supplier.id %>/goods" class="btn btn-link">Отмена</a>
            <button type="submit" class="btn btn-primary">
                <% if (isNew) { %>
                    Добавить товар
                <% } else { %>
                    Сохранить
                <% } %>
            </button>
        </div>
    </form>
</script>
