

var callCount = 0;
var objectives = [];

var FLAG = 'key';//what to print

function returnSum(val){
	var transitionIndex = val.id.split(/-|\./);
	var summation = parseInt(transitionIndex[0]);
	for (var i=1; i<transitionIndex.length; i++){
		summation+=parseInt(transitionIndex[i])/Math.pow(10,i);
	}
	if(isNaN(summation)) summation = -1;
	return summation;
}


function sortByIndex(x,y){
	return returnSum(x) - returnSum(y);
}

function createAnchor(str){
	str = str.replace(/(\d|\W)+/g,'-').toLowerCase();
	return str.replace(/^-|-$/gm,'');
}


function getBaseHelper($obj,list){
	var $children = $obj.children('list');
	if($obj.children('li').length) {
		$.each($obj.children(), function(i,val){
			if($(this).is('li')){
				list.push($(this));
			}else if($(this).is('list')){
				list.push(getBaseHelper($(this),[]))
			}
		});
	}
	return list;
}

function getBase($obj){
	return getBaseHelper($obj,[]);
}



function flattenArrHelper(arr,str){
	for (var i=0; i<arr.length; i++){
		if(Array.isArray(arr[i])){
			str+='<li><ul>';
			str+=flattenArrHelper(arr[i],'');
			str+='</ul></li>';
		}else{
			str+='<li>'+arr[i].text()+'</li>';
		}
	}
	return str;
}

function flattenArr(arr){
	return flattenArrHelper(arr,'');
}	

function fetchObjectiveDetails(obj, completionCount){
	//manage non id based entries

		function count(){
			callCount++;
			$('#count').text(callCount);
	  		if(callCount == completionCount){
	  			console.log("all done");
	  			$('#loading').remove();

				for (var k=0; k<objectives.length; k++){
					createOrganizedDataDetails(objectives[k]);
				}

	  			printToScreen();
	  		}
		}

		if(!parseInt(obj.id)) {
			count();
	  		return;
		}
		$.ajax({
		crossOrigin: "true",
	  	method: "GET",
	  	url: "https://apps.mcc.ca/ObjectivesWS/ObjectivesWS.asmx/GetXMLObjective?lang=en&id="+obj.id,
	  	dataType:"text"
		}).fail(function(err) {
	    console.log( "error",err );
	  	})
	  	.done(function(data) {
	   	 console.log( "success");
	   	 obj.detailsJSON = $.xml2json(data);
	   	 obj.detailsXML = data;
	  	})
	  	.always(function(){
	  		count();
	  	});
  
}


function createOrganizedDataDetails(obj){

	if(!obj.detailsJSON){
		return;	
	} 

	//require xml to keep appropriate order for nested lists
	var xmlDoc = $.parseXML(obj.detailsXML);
	var $xmlSnippet = $(xmlDoc).find('section');
	
		//objectives that have been remapped - no section content
	if(obj.detailsJSON.objective.crossRef){
		var cross = obj.detailsJSON.objective.crossRef;
		var wrapper = [];
		if(!Array.isArray(cross)){
			wrapper.push(cross);
		}else{
			wrapper = cross;
		}
		obj.crossReferences='';
		for (var i=0; i<wrapper.length; i++){
			obj.crossReferences += ''+wrapper[i]['$']['intro']+':<a href="#'+createAnchor(wrapper[i]['_'])+'">'+wrapper[i]['_']+'</a>';
		}
	}

	obj.formattedSections = [];

	$.each(obj.detailsJSON.objective.section,function(index,value){

		var elem='';
		var title = value['$'].title;

		var crossReferences = '';

		if(title){
			//inline crossreferences
			if(typeof value.p == "object" && value.p.crossRef){
				value.p.crossRef.forEach(function(e){
					crossReferences+=e['_']+', ';
				});
				crossReferences = crossReferences.slice(0,-2);
			}

			//Add any bulleted lists to current section
			var $currentSection = $xmlSnippet.filter("[title='"+title+"']");
		

			$.each($currentSection.children(), function(i,val){
				if($(this).is('p')){
					elem+='<p>'+$(this).text()+'</p>';
				}else if ($(this).is('list')){
					var bullets = getBase($(this),[]);	
					elem += '<ul>'+flattenArr(bullets)+'</ul>';
				}

			});
			
			
			var sectionObj = {'section':{}};
			
			sectionObj['sectionTitle'] = title;
			sectionObj['bullets'] = elem;
			sectionObj['crossReferences'] = crossReferences;
			

			obj.formattedSections.push(sectionObj);
			
		}
	});
	
	return obj;
}


function addDetails(obj){

	if(!obj.detailsJSON){
		return;	
	} 

	var str='';
	
	if(obj.crossReferences){
		str+=obj.crossReferences;
	}

	str+='<div class="Rtable Rtable--1cols Rtable--collapse">';

	console.log(obj)

	for (var i=0; i<obj.formattedSections.length; i++){
		var section = obj.formattedSections[i];


		if(section.sectionTitle){
			
			str+='<div class="Rtable-cell Rtable-cell--head"><h4>'+section.sectionTitle+'</h4></div>';
		
			
			str+='<div class="Rtable-cell">'+section.crossReferences+section.bullets+'</div>';
		}
	}
	
	str+='</div>';
	return str;	
}




function listOnlyKeyObjectives(){
	var str = '';
	str+='<h2>Key Objectives</h2>';
	for (var i=0; i<objectives.length; i++){
		var obj = objectives[i];
		
			str+='<p><h3>'+obj.id+' '+obj.title+'</h3>';
			str+=obj.crossReferences||'';


			for (var j=0; j<obj.formattedSections.length; j++){
				var section = obj.formattedSections[j];
				if(section.sectionTitle == "Key Objectives"){
					str+=section.bullets;
				}
			}
			str+="</p>";
		}
	
	console.log(objectives)


	$('#results').append(str);
}



function printToScreen(){


	if(FLAG=='key'){
		listOnlyKeyObjectives();
		return;
	}



	var entry = '';
	var curIndex=0;
	var isNewPara;
	var toc = '';
	var toc2 = '';
	var splitIndex = 71;
	var titleCount = 0;
	for (var i=0; i<objectives.length; i++){
		isNewPara = objectives[i].index - curIndex;
		if(isNewPara){
			entry+="<p>";
		}
		if(objectives[i].bulletindex>0){
			for (var j=0; j<objectives[i].bulletindex; j++){
				entry+="";
			}
			entry+="<h3>"+objectives[i].id+" "+objectives[i].title+"</h3>";
			entry+=addDetails(objectives[i]);
			
		}else{
			var anchor = createAnchor(objectives[i].title);
			entry+='<h2 class="section-header" id="'+anchor+'">'+objectives[i].index+ " "+objectives[i].title+"</h2>";
			entry+=addDetails(objectives[i]);
			titleCount++;
			if(titleCount<splitIndex){
				toc+='<li><a href="#'+anchor+'">'+objectives[i].title+'</a></li>';
			}else{
				toc2+='<li><a href="#'+anchor+'">'+objectives[i].title+'</a></li>';
			}
		}

		if(isNewPara){
			entry+="</p>";
		}

		curIndex=objectives[i].index;
	}
	$('#results').append('<div class="toc"><div class="Rtable Rtable--2cols"><div class="Rtable-cell" style="order:1;"><ol>'+toc+'</ol></div><div class="Rtable-cell" style="order:2;"><ol start="'+splitIndex+'">'+toc2+'</ol></div></div></div>');
	$('#results').append(entry);
	
}


function parse(data){
	var results = data.root.results.result;
	for (var i=0; i<results.length; i++){
		var role = results[i]['role'];
		var listIndex = (results[i]['id'].split(/-|\./));
		var indexId = parseInt(listIndex[0]) || 0;
		if(role=='expert' && indexId){
			var obj={
				index:indexId,
				bulletindex:listIndex.length-1,
				id:results[i]['id'],
				title:results[i]['title']
			}
			

			
				objectives.push(obj);
			
			
			
			
		}
	};

	objectives.sort(sortByIndex);
	$('#total').text(objectives.length);

	for (var i=0; i<objectives.length; i++){
		fetchObjectiveDetails(objectives[i], objectives.length);
	}

	
}



$.ajax({
  method: "GET",
  url: "https://apps.mcc.ca/ObjectivesWS/ObjectivesWS.asmx/GetList?lang=en&sort=title",
  dataType: 'text',
  crossOrigin: true
  
}).fail(function(err) {
    console.log( "error",err );
  })
  .done(function( data ) {
    console.log( "success");
    parse($.xml2json(data));
  });



