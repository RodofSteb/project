//& Imports
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

//& Functions
function uploader_create_entry(file_name) {

    file_name = file_name ? file_name : "undefined";
    let visual_file_name = file_name;

    if (visual_file_name.includes(".csv")) {
        visual_file_name = visual_file_name.split(".csv")[0];
    }

    let crafted_element = `
    
        <div class="uploader-table-entry" file-name="${file_name}">
            <div class="uploader-table-entry-header">
                <div class="uploader-table-entry-header undraggable">${visual_file_name}</div>
                <div class="uploader-table-entry-extension undraggable">CSV</div>
            </div>

            <div class="uploader-table-entry-actions">

                <button id="uploader-delete" class="uploader-table-entry-actions-button">
                    <img class="icon delete" src="../static/icons/trash.svg" alt="delete">
                </button>

                <button id="uploader-visualize" class="uploader-table-entry-actions-button">
                    <img class="icon" src="../static/icons/arrow-right.svg" alt="delete">
                </button>

            </div>

        </div>
    
    `
    return crafted_element;
}

function visualizer_craft() {

    $(".visualizer-primary-graph")[0].innerHTML = ""

    var graph_width = 1000;
    var graph_height = 500;
    var graph_margin = { top: 20, right: 30, bottom: 40, left: 50 };
    var y_min = 0;
    var y_max = null;



    const pastel_colors = [
        '#F472B6', '#8B5CF6', '#D8B4FE',
        '#60A5FA', '#38BDF8', '#22C55E', '#A7F3D0', '#FACC15',
        '#FCD34D', '#EC4899', '#F9A8D4', '#8B5CF6', '#D8B4FE'
    ];


    {
        // Parse data
        var data = current_visualizer_file.slice(1).map(d => {
            var parts = d.split(",");
            return { hour: parts[0], item: parts[1], quantity: +parts[2] };
        });

        // Group data by item
        var grouped_data = {};
        data.forEach(d => {
            if (!grouped_data[d.item]) grouped_data[d.item] = [];
            grouped_data[d.item].push(d);
        });

        // Ensure all hours are represented
        var all_hours = [...new Set(data.map(d => d.hour))];
        Object.keys(grouped_data).forEach(item => {
            var existing_hours = new Set(grouped_data[item].map(d => d.hour));
            all_hours.forEach(hour => {
                if (!existing_hours.has(hour)) {
                    grouped_data[item].push({ hour, item, quantity: 0 });
                }
            });
            grouped_data[item].sort((a, b) => a.hour.localeCompare(b.hour));
        });

        // Append the primary graph container
        var svg = d3.select(".visualizer-primary-graph")
            .append("svg")
            .attr("width", graph_width + graph_margin.left + graph_margin.right)
            .attr("height", graph_height + graph_margin.top + graph_margin.bottom)
            .append("g")
            .attr("transform", `translate(${graph_margin.left},${graph_margin.top})`);

        // Scales
        var x_scale = d3.scaleBand()
            .domain(all_hours)
            .range([0, graph_width])
            .padding(0.1);

        if (y_max === null) {
            y_max = d3.max(data, d => d.quantity) + 100;
        }

        var y_scale = d3.scaleLinear()
            .domain([y_min, y_max])
            .range([graph_height, 0]);

        // Draw grid lines (remove axis line)
        svg.append("g")
            .call(d3.axisLeft(y_scale).tickSize(-graph_width).tickPadding(10))
            .selectAll("line")
            .attr("stroke", "#E5E7EB");

        svg.selectAll(".domain").remove();

        // Color the bars
        var items = Object.keys(grouped_data);
        var colors = {};
        for (var i = 0; i < items.length; i++) {
            colors[items[i]] = pastel_colors[i % pastel_colors.length];
        }

        // Draw bars
        Object.keys(grouped_data).forEach(item => {
            svg.selectAll(".bar-" + item.replace(/\s+/g, "-"))
                .data(grouped_data[item])
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", d => x_scale(d.hour))
                .attr("y", d => y_scale(d.quantity))
                .attr("width", x_scale.bandwidth())
                .attr("height", d => graph_height - y_scale(d.quantity))
                .attr("fill", colors[item]);
        });

        // Move grid lines to the back after bars are drawn
        svg.select("g").lower();

        // Draw legends
        var legend_container = d3.select(".visualizer-primary-graph")
            .append("div")
            .style("display", "flex")
            .style("flex-wrap", "wrap")
            .style("margin-top", "20px");

        items.forEach(item => {
            var legend_item = legend_container.append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .style("margin-right", "15px")


            legend_item.append("div")
                .style("width", "20px")
                .style("height", "20px")
                .style("background-color", colors[item])
                .style("margin-right", "5px")
                .style("border-radius", "3px");

            legend_item.append("span")
                .text(item)
                .style("font-family", "inherit")
                .style("font-size", "14px");
        });

        // Axes (remove axis line)
        svg.append("g")
            .attr("transform", `translate(0,${graph_height})`)
            .call(d3.axisBottom(x_scale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .style("font-family", "Outfit, sans-serif")
            .style("font-size", "12px");

        svg.append("g")
            .call(d3.axisLeft(y_scale).tickSize(-graph_width).tickPadding(10))
            .selectAll("line")
            .attr("stroke", "#E5E7EB")
            .lower()
            .selectAll("text") // Target y-axis labels
            .style("font-family", "Outfit, sans-serif")
            .style("font-size", "12px");

        svg.selectAll(".domain").remove();

        // Tooltip
        var tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("background", "white")
            .style("border", "1px solid #ddd")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("display", "none");

        // Hover interaction
        svg.selectAll("rect")
            .on("mouseover", (event, d) => {
                tooltip.style("display", "block")
                    .html(`${d.hour} - ${d.item}: ${d.quantity}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", () => tooltip.style("display", "none"));

    }

}

var current_visualizer_file = [];

//^ DOM LOADED
$(document).ready(function () {

    // Containers:
    const uploader_table_container = ".uploader-table";

    // Buttons:
    const upload_button = "#uploader-upload";
    const file_input = "#csvFiles"

    //& Listeners
    $(document).on("click", upload_button, function () {

        // Trigger the File input DOM, We do this because we want the looks of a Simple button with an Icon however,
        // Since Inputs dont allow for inline contnet inside the input we need to use a button to display the icon
        $(file_input)[0].click();
    })

    $(document).on("change", file_input, function (event) {

        // Get Content upload from the user in a FormData OBJ
        let files = event.target.files;
        let form_data = new FormData();

        for (let i = 0; i < files.length; i++) {
            form_data.append('csv_files', files[i]);
        }

        let continue_upload = true;

        // Make the request to the server 
        fetch('/uploader', {
            method: 'POST',
            body: form_data,
        })
            .then(response => {
                // Determine if the request was sucessfull, exiting early if not 
                if (response.ok) {
                    return response;
                } else {
                    continue_upload = false;
                    alert(`Upload failed due to a missing connection, invalid file type or a duplicate file being uploaded`)
                    return
                }
            })
            .then(data => {
                if (!continue_upload) { return }

                // Process the data that we just uploaded
                for (let i = 0; i < files.length; i++) {
                    let element = files[i].name;

                    if ($(uploader_table_container).find(`.uploader-table-entry[file-name="${element}"]`).length > 0) {
                        continue
                    }

                    let item = uploader_create_entry(element);
                    $(uploader_table_container)[0].innerHTML += item
                }
            })




    });

    $(document).on("click", "#uploader-visualize", function () {

        // Get the file name
        let selcted_file_name = $(this).closest(".uploader-table-entry").attr("file-name");
        if (!selcted_file_name) { console.warn("no file name???"); return }

        // Redirect to visualizer page with the selected file name in the url
        window.location.href = `/visualizer?file_name=${selcted_file_name}`
    })

    $(document).on("click", "#uploader-delete", function () {

        // Get the file name
        let selcted_file_name = $(this).closest(".uploader-table-entry").attr("file-name");
        if (!selcted_file_name) { console.warn("no file name???"); return }

        // Confirm with the user if he really wants to delete the selected file
        if (!confirm("Are you sure you want to delete this file from the database?")) {
            return
        }

        // Delete the file
        fetch(`/delete_file/${selcted_file_name}`, {
            method: "DELETE"
        })
            .then(response => response.json())
            .then(data => {

                $(this).closest(".uploader-table-entry").remove();

            })
            .catch(error => {
                alert("Delete request failed")
            });


    })

    $(document).on("click", "#visualizer-back", function () {
        window.location.href = `/uploader`
    })

    //& Display data fetched from the database

    {
        fetch("/get_files")
            .then(response => response.json())
            .then(data => {

                if ($(uploader_table_container).length) {
                    $(uploader_table_container).children(".uploader-table-entry").remove()


                    for (let i = 0; i < data.length; i++) {
                        let element = data[i];

                        let item = uploader_create_entry(element?.file_name);
                        $(uploader_table_container)[0].innerHTML += item
                    }
                }

                let url_params = new URLSearchParams(window.location.search);
                let file_name = url_params.get("file_name");

                let current_visualizer_index = data.find(
                    element => element?.file_name == file_name
                )?.file_content;

                if (current_visualizer_index) {
                    if (current_visualizer_index.length < 0) { return }

                    current_visualizer_file = current_visualizer_index;
                    visualizer_craft()

                }
            })

            .catch(error => console.error("Error fetching files:", error));



    }


})



