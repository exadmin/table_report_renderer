function getSearchParam(param) {
    return new URLSearchParams(window.location.search).get(param) || "";
};

// Put there required render functions to allow rendering of any object type.
function defaultRender (data, type, row, meta) {
// Default render supports:
// 1. String: just return the string (can be html).
// 2. Object with structure:
//   {
//      "title": "<html>",      # Tooltip of cell
//      "href": "<url>",        # Link in cell
//      "value": "string"       # Value of cell
//   }
if (data.title && data.href) {
    return '<div title="<p class=\'my-tooltip\'>' + data.title + '</p>"><a href="' + data.href + '" target="_blank">' + (data.value || '&nbsp;') + '</a></div>';
} else if  (data.title) {
    return '<div title="<p class=\'my-tooltip\'>' + data.title + '</p>">' + (data.value || '&nbsp;') + '</div>';
} else if (data.href) {
    return '<a href="' + data.href + '" target="_blank">' + (data.value || '&nbsp;') + '</a>';
} else {
    return String(data);
}
}

$(document).ready(function() {
// Add custom sorting for 'only-numbers'
jQuery.extend( jQuery.fn.dataTableExt.oSort, {
    "only-numbers-asc": function ( a,b ) {
        var x = parseFloat(String(a).replace( /[^0-9\.]/g, "" ).replace( /^\.+/g, "")) || -1;
        var y = parseFloat(String(b).replace( /[^0-9\.]/g, "" ).replace( /^\.+/g, "")) || -1;
        return x - y;
    },
    "only-numbers-desc": function ( a,b ) {
        var x = parseFloat(String(a).replace( /[^0-9\.]/g, "" ).replace( /^\.+/g, "")) || -1;
        var y = parseFloat(String(b).replace( /[^0-9\.]/g, "" ).replace( /^\.+/g, "")) || -1;
        return y - x;
    }
} );

$.getJSON('./data/data.json', function(data) {
    const reportName = data.reportName;
    const reportDate = data.reportDate;
    const tables = data.tables;

    // document.title = `Report ${reportName} on ${reportDate}`;
    // $('#report-name').text(`Report: ${reportName} generated at ${reportDate}`);

    let tabList = $('#tab-list');
    let tabsContainer = $('#tabs');

    tables.forEach((tableData, index) => {
        // Add tab
        tabList.append(`<li><a href="#tabs-${index + 1}">${tableData.title || index + 1}</a></li>`);

        // Add tab content with table
        tabsContainer.append(`<div id="tabs-${index + 1}"><table id="table-${index + 1}" class="display"></table></div>`);

        // Add help urls to column titles if exists
        tableData.columns.forEach(column => {
            if (column.help_url) {
                column.title += `<a href="${column.help_url}" target="_blank" class="help-icon">❔</a>`;
            }
            column.render = window[column.render] || defaultRender;
        });

        // Initialize DataTable
        $(`#table-${index + 1}`).DataTable({
            data: tableData.data,
            columns: tableData.columns,
            pageLength: -1,
            autoWidth: false,
            search: {
                search: getSearchParam('search')
            }
        });
        $(`#table-${index + 1}`).on('search.dt', function syncSearches() {
            searchValue = $(this).DataTable().search();
            window.history.replaceState(null, null, `?search=${encodeURIComponent(searchValue)}` + window.location.hash);
            $.fn.dataTable.tables().forEach(function(table) {
                if (table !== this) {
                    $(table).off('search.dt');
                    $('#'+table.id+'_filter input')[0].value = searchValue;
                    $(table).DataTable().search(searchValue).draw();
                    $(table).on('search.dt', syncSearches);
                }
            });
        });
    });

    // Initialize tabs
    $("#tabs").tabs({
            activate: function(event, ui) {
                window.location.hash = ui.newPanel.attr('id');
            }
        }
    );
});

$(function() {
  $(document).tooltip({
    content: function() {
      // Keep this code - to force JQueryUI render <br> as a new line!
      return $(this).prop('title');
    }
  });
});
});

let replaceMacrosIsDone = false;

// Function to fetch JSON data and replace macros
async function replaceMacros() {
    if (replaceMacrosIsDone) return;

    try {        
        replaceMacrosIsDone = true;

        // 1. Fetch the external JSON file
        const response = await fetch('./data/macros.json');
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        const data = await response.json();
        
        // 2. Get the entire HTML content
        let html = document.documentElement.outerHTML;
        
        // 3. Replace all macros with values from the JSON data
        for (const [key, value] of Object.entries(data)) {
            const macro = `{{${key}}}`;
            const regex = new RegExp(macro, 'g');
            html = html.replace(regex, value);
        }
        
        // 4. Update the document with the replaced content
        document.open();
        document.write(html);
        document.close();
        
    } catch (error) {
        console.error('Error replacing macros:', error);
    }
}

window.addEventListener('DOMContentLoaded', replaceMacros);