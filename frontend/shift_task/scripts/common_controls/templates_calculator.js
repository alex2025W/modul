'use strict';
/**
  * @desc this class for calculate cutting templates in shift tasks
*/
class TemplatesCalculator {
 /**
   * @desc class constructor
   * @param list $templates - list of templates objects
   * @param list $specifications - list of specifications backbone  models
  */
  constructor(templates, specifications) {
    this.templates = templates
    this.specifications = specifications
  }

 /**
   * @desc calculate fact templates volumes by specifications
   * @param list $out_items list of specifications to calculate
   * @return list of calculated templates: [{_id: count}]
  */
  calculate_facts_by_specifications(out_items){
    let result = null;
    let templates_vectors = []   // vectors from templates [[0,2,1],[0,0,1],[45,0,0]]
    let templates_limits = []       // maximum apply count for every template
    let out_items_vector = []     // vector from out items [3,2,6]
    // get all templates who can make selected specifications
    let templates = this.find_templates_by_out_objects(out_items.map((x)=>{return x['_id']}))
    // combine templates to produce specified specifications
    if(templates && templates.length>0)
    {
      // prepare out items data
      for(let item of out_items)
        out_items_vector.push(item['_id'])
      // prepare templates vectors
      for(let template of templates)
      {
        let tmp_vector = new Array(out_items.length).fill(0)
        for(let out_object of template['out_objects'])
        {
          if (out_items_vector.indexOf(out_object['_id'])>-1)
            tmp_vector[out_items_vector.indexOf(out_object['_id'])] = out_object['count']
        }
        templates_vectors.push(tmp_vector)
        //------------
        templates_limits.push(template['count'])
      }
      // prepare out items vector
      out_items_vector = []
      for(let item of out_items)
        out_items_vector.push(item['count'])

      result = {}
      let tmp_res = new TemplatesCombiner().calculate(out_items_vector, templates_vectors, templates_limits).map((val, i)=>{return {_id: templates[i]['_id'], count: val}})
      for(let item of tmp_res)
        result[item['_id']] = item['count']
    }
    return result;
  }

  /**
   * @desc calculate plans templates volumes by specifications
   * @param list $out_items list of specifications to calculate
   * @return list of calculated templates: [{_id: count}]
  */
  calculate_plans_by_specifications(out_items){
    let result = null;
    let templates_vectors = []   // vectors from templates [[0,2,1],[0,0,1],[45,0,0]]
    let templates_limits = []       // maximum apply count for every template
    let out_items_vector = []     // vector from out items [3,2,6]
    // get all templates who can make selected specifications
    let templates = this.find_templates_by_out_objects(out_items.map((x)=>{return x['_id']}))
    // combine templates to produce specified specifications
    if(templates && templates.length>0)
    {
      // prepare out items data
      for(let item of out_items)
        out_items_vector.push(item['_id'])
      // prepare templates vectors
      for(let template of templates)
      {
        let tmp_vector = new Array(out_items.length).fill(0)
        for(let out_object of template['out_objects'])
        {
          if (out_items_vector.indexOf(out_object['_id'])>-1)
            tmp_vector[out_items_vector.indexOf(out_object['_id'])] = out_object['count']
        }
        templates_vectors.push(tmp_vector)
        //------------
        templates_limits.push(template['qty'] - template['fact_count'])
      }
      // prepare out items vector
      out_items_vector = []
      for(let item of out_items)
        out_items_vector.push(item['count'])

      result = {}
      let tmp_res = new TemplatesCombiner().calculate(out_items_vector, templates_vectors, templates_limits).map((val, i)=>{return {_id: templates[i]['_id'], count: val}})
      for(let item of tmp_res)
        result[item['_id']] = item['count']
    }
    return result;
  }

  /**
   * @desc find all templates who have specified specifications among the output objects
   * @param dictionary $specifications - specifications to calculate: {'id':volume}
   * @return list of templates who can make specified specifications
   */
    find_templates_by_out_objects(specifications)
    {
      if(this.templates)
      {
        return this.templates.filter((item)=>{
          if(item['out_objects'].filter((out_object)=>{return (specifications.indexOf(out_object['_id'])>-1)} ).length>0)
                    return true
            return false
        });
      }
      return null;
    }
}

/**
 *@desc this class for searching optimal templates combination by specifications
*/
class TemplatesCombiner {
  /**
   * @desc calculate templates combination to produce out_items
   * @param list $out_items_vector - list of specifications
   * @param list $templates_vectors - list of templates
   * @param list $templates_limits - list of templates limits
  */
  calculate(out_items_vector, templates_vectors, templates_limits) {
    // get combined templates
    let combination = []
    this.processData(out_items_vector,templates_vectors,templates_limits, combination)
    // prepare result
    let result = new Array(templates_vectors.length).fill(0)
    for(let item of combination)
      result[item]++
    return result
  }

  /**
   * @desc get optimal templates combination by enter specifications
   * @out_items_vector - specifications vector with volumes: [18]
   * @templates - vector of templates volumes: [[1],[1]]
   * @tem plates_limit - limit for using templates: [16,2]
  */
  processData(out_items_vector, templates, templates_limits, result){
    let lengths = [];
    // search by every template his balance length
    // nullen - vector length withuout negative values
    // len - vector length
    for(let i=0;i<templates.length;++i){
      let len = 0;
      let nul_len = 0;
      let t = templates[i];
      if(templates_limits[i]>0){
        for(let j=0; j<t.length;++j){
          let diff = out_items_vector[j]-t[j];
          if(diff>0)
            nul_len+=diff;
          len+= Math.abs(out_items_vector[j]-t[j]);
        }
      }
      lengths.push({'nullen':nul_len, 'len':len});
    }
    // ищем индекс шаблона с наименьшим остатком
    let index = 0;
    while(index<templates_limits.length){
      if(templates_limits[index]>0)
        break;
      index++;
    }
    // если закончились все шаблоны, которые могут обслужить данные
    if(index>=templates_limits.length)
      return;
    for(let i=index+1;i<lengths.length;++i){
      if(templates_limits[i]>0 && (lengths[index].nullen>lengths[i].nullen || (lengths[index].nullen==lengths[i].nullen && lengths[index].len>lengths[i].len)))
        index = i;
    }
    result.push(index);
    // вычитаем из остатка out_items_vector наименьший шаблон
    let t = templates[index];
    templates_limits[index]--;
    // проверяем, есть ли еще данные в остатке
    let is_finish = true;
    let nullen_before = 0;
    let nullen_after = 0;
    for(let j=0; j<t.length;++j){
      if(out_items_vector[j]>0)
        nullen_before+=out_items_vector[j];
      out_items_vector[j] -= t[j];
      if(out_items_vector[j]>0)
        nullen_after+=out_items_vector[j];
      if(out_items_vector[j]>0)
        is_finish = false;
    }
    // эта проверка на то, что если нужен вектор, которые нельзя собрать из имеющихся шаблонов (т.е. его длина за последнюю итерацию не изменилась)
    if(nullen_before==nullen_after)
      is_finish = true;
    if(!is_finish)
      this.processData(out_items_vector,templates,templates_limits, result);
  }
}


/**
  * @desc this class for searching optimal templates combination by specifications
  * Old version. Vorking good but rather slow then new version
*/
class TemplatesCombinerOld {
  /**
   * @desc calculate templates combination to produce out_items
   * @param list $templates - list of templates objects
   * @param list $specifications - list of specifications, which need to produce using  templates : { key: '', _id:'',  count:0}
  */
  calculate(templates, out_items) {
    let result = []
    let templates_vectors = []  // vectors from templates [[0,2,1],[0,0,1],[45,0,0]]
    let templates_limits = []       // maximum apply count for every template
    let out_items_vector = []     // vector from out items [3,2,6]
    // prepare out items data
    for(let item of out_items)
      out_items_vector.push(item['_id'])
    // prepare templates vectors
    for(let template of templates)
    {
      let tmp_vector = new Array(out_items.length).fill(0)
      for(let out_object of template['out_objects'])
      {
        if (out_items_vector.indexOf(out_object['_id'])>-1)
          tmp_vector[out_items_vector.indexOf(out_object['_id'])] = out_object['count']
      }
      templates_vectors.push(tmp_vector)
      templates_limits.push(template['count'])
    }
    // prepare out items vector
    out_items_vector = []
    for(let item of out_items)
      out_items_vector.push(item['count'])

    // get all combinations
    let combs = this.prepare_data(out_items_vector, templates_vectors)
    let data_res = []
    for(let i of combs)
    {
      let index = 0
      this.finddata(i['vector'],i['templates'],0,[],result)
      // make templates vector volumes
      let templates_volumes = []
      for(let t of i['templates'])
        templates_volumes.push(templates[templates_vectors.indexOf(t)]['in_object']['count'])
      // sort result
      result.sort((a,b)=>{
        if(a.length>b.length)
          return 1
        if(a.length<b.length)
          return -1
        return 0
      })
      let opt = [result[0]]
      let decoded_res = []
      for(let r_template of opt){
        for (let r_item of r_template)
          decoded_res.push(templates_vectors.indexOf(i['templates'][r_item]))
      }
      data_res= data_res.concat(decoded_res)
    }
    data_res.sort()
    data_res = this.remove_unused_templates(data_res, templates_vectors, out_items_vector)
    return  data_res
  }

  /**
  * @desc This function returns a list of tuples, where the i-th tuple contains the i-th
  * element from each of the argument sequences or iterables.
  */
  zip(arr, ...arrs) {
    return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val]));
  }

  /**
  * @desc
  */
  prepare_data(vector, matrix){
    let all_vectors = []
    let res_matrix = []
    if(matrix.length>2)
    {
      let complete = false
      let iters = 0
      while(!complete && iters<100)
      {
        iters++
        let new_matrix = matrix.filter((item)=>{return all_vectors.indexOf(item)<0})
        let t_res = []
        if(new_matrix)
        {
          if(new_matrix.length==2)
          {
              if(this.is_vectors_has_links(new_matrix[0],new_matrix[1]))
              {
                res_matrix.push(new_matrix)
                all_vectors= all_vectors.concat(new_matrix)
              }
              else
              {
                res_matrix.push([new_matrix[0]])
                res_matrix.push([new_matrix[1]])
              }
              complete = True
          }
          else if(new_matrix.length>1)
          {
            this.get_matrix(new_matrix[0], new_matrix.slice(1,), t_res)
            if (t_res.length>0)
            {
              res_matrix.push(t_res)
              all_vectors = all_vectors.concat(t_res)
            }
            else
            {
              res_matrix.push([new_matrix[0]])
              all_vectors.push(new_matrix[0])
            }
          }
          else
          {
            res_matrix.push([new_matrix[0]])
            all_vectors.push(new_matrix[0])
            complete = true
          }
        }
        else
          complete = True
      }
    }
    else
      res_matrix.push(matrix)

    let combs = []
    for(let matrix of res_matrix)
    {
      let t_matrix = matrix
      let comb = {'templates': t_matrix, 'vector': new Array(vector.length).fill(0)}
      combs.push(comb)
      let tmp_template = new Array(vector.length).fill(0)

      for (let i of t_matrix)
          tmp_template = this.zip(tmp_template,i).map(item=>item[0]+item[1])

      let i=0
      for(let item of tmp_template){
        if(item)
          comb['vector'][i] = vector[i]
        i++
      }
    }
    return combs
  }

  /**
   * @desc
   */
 is_vectors_has_links(vector1, vector2){
    let i = 0
    while (i<vector1.length){
      if (vector1[i]>0 && vector2[i]>0)
        return true
      i++
    }
    return False
  }

  /**
   * @desc
   */
  get_matrix(vector, matrix, result){
    for(let item of matrix){
      if(result.indexOf(item)<0 && this.is_vectors_has_links(vector, item) )
      {
        if(result.indexOf(vector)<0)
          result.push(vector)
        if(result.indexOf(item)<0)
          result.push(item)
        get_matrix(item, matrix, result)
      }
    }
  }

  /**
   * @desc
   */
  finddata(obj, templates, start_index, local_res, result){
    if(result.length>1000)
      return
    let i=start_index
    while (i<templates.length)
    {
      let obj_cpy = JSON.parse(JSON.stringify(obj))
      let local_res_cpy = JSON.parse(JSON.stringify(local_res))
      local_res_cpy.push(i)
      let t = templates[i]
      if (this.extract(obj_cpy,t))
      {
        if (this.is_full(obj_cpy))
          result.push(local_res_cpy)
        else
          this.finddata(obj_cpy,templates,i,local_res_cpy,result)
      }
      i++
    }
  }

  /**
   *@ desc
   */
   extract(obj, template){
    let i=0
    let is_changed = false
    while(i<obj.length){
      if (obj[i]>0 && template[i]>0)
        is_changed = true
      i++
    }
    if(is_changed){
      i=0
      while(i<obj.length){
        obj[i]-=template[i]
        i++
      }
    }
    return is_changed
  }

  /**
   *@ desc
   */
  is_full(obj){
    for(let i of obj)
      if(i>0)
        return false
    return true
  }

  /**
   *@ optimization function
   */
  remove_unused_templates(result, templates, out_items_vector){
    let all_data = new Array(out_items_vector.length).fill(0)
    for(let t of result){
     let i=0
      while(i<all_data.length){
        all_data[i]+=templates[t][i]
        i++
      }
    }
    let used_result = []
    let j = 0
    while(j<result.length)
    {
      let i=0
      let r = result[j]
      let can_remove = true
      while(i<all_data.length && can_remove){
        if (out_items_vector[i]>(all_data[i]-templates[r][i]))
          can_remove = false
        i++
      }
      if (!can_remove)
      {
        while(j<result.length && result[j]==r){
          used_result.push(r)
          j++
        }
      }
      else
      {
       let  i=0
        while(i<all_data.length)
        {
          all_data[i]-=templates[r][i]
          i++
        }
        j++
      }
    }
    return used_result
  }
}
