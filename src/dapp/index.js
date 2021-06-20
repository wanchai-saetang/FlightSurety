import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

const statusMapping = new Map([
  [0, "STATUS_CODE_UNKNOWN"],
  [10, "STATUS_CODE_ON_TIME"],
  [20, "STATUS_CODE_LATE_AIRLINE"],
  [30, "STATUS_CODE_LATE_WEATHER"],
  [40, "STATUS_CODE_LATE_TECHNICAL"],
  [50, "STATUS_CODE_LATE_OTHER"],
]);
(async () => {
  let result = null;

  let contract = new Contract("localhost", () => {
    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);
      display("Operational Status", "Check if contract is operational", [
        { label: "Operational Status", error: error, value: result },
      ]);
    });

    contract.watchFlightStatus((value) => {
      const statusElement = document.querySelector(
        "#display-wrapper > section:last-child > div > div:last-child"
      );
      statusElement.textContent = `${value.returnValues.flight} : ${Date(
        value.returnValues.timestamp
      )} : ${statusMapping.get(+value.returnValues.status)}`;
    });

    // User-submitted transaction
    DOM.elid("submit-oracle").addEventListener("click", () => {
      let flight = DOM.elid("flight-number").value;
      // Write transaction
      contract.fetchFlightStatus(flight, (error, result) => {
        display("Oracles", "Trigger oracles", [
          { label: "Fetch Flight Status", error: error, value: "pending" },
        ]);
      });
    });
  });
})();

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}
