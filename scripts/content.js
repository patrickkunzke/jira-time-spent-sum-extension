(function () {
    let timeSpentHeader;
    let issueTable;
    let observer;
    const estimationFormats = ["week", "day", "hour", "minutes"];
    const shortEstimationFormats = ["w", "d", "h", "m"];

    const JiraTimeSpentSum = {
        init: function () {
            this.setupTableHeader();
            this.setupIssueTable();
            this.injectTimeSpentSum();
            this.observeDOM();
        },

        setupTableHeader: function () {
            timeSpentHeader = document.querySelector(".headerrow-timespent");
        },

        setupIssueTable: function () {
            issueTable = document.querySelector(".navigator-content");
        },

        injectTimeSpentSum: function () {
            // `document.querySelector` may return null if the selector doesn't match anything.
            if (timeSpentHeader) {
                const timeSpentSumNode = document.createElement("aui-badge");
                timeSpentSumNode.classList.add("time-spent-sum");
                timeSpentSumNode.textContent = this.getSpentTime();
                timeSpentHeader.insertAdjacentElement("beforeend", timeSpentSumNode);
            } else {
                console.log("Jira Time Spent Sum Extension: Did not find column 'Time Spent' to add sum.");
            }
        },

        getSpentTime: function () {
            const timeSpentCells = Array.from(document.querySelectorAll(".timespent"));

            const timeSpentEntries = timeSpentCells.map((cell) => {
                return cell.innerText;
            });

            const parsedEntries = timeSpentEntries.map((entry) => {
                let sortedEstimates = {};

                entry.split(", ").forEach((segment) => {
                    const timeSegment = estimationFormats.filter(
                        (char) => segment.includes(char)
                    );

                    if (timeSegment.length > 0) {
                        const timeValue = segment.split(timeSegment)[0];
                        sortedEstimates[timeSegment] = parseInt(timeValue);
                    }
                })

                return sortedEstimates;
            })

            let laneEstimates = {};

            parsedEntries.forEach((timeEstimate) => {
                if (timeEstimate) {
                    for (let [key, value] of Object.entries(timeEstimate)) {
                        if (laneEstimates[key]) {
                            laneEstimates[key] = Number(laneEstimates[key]) + Number(value);
                        } else {
                            laneEstimates[key] = value;
                        }
                    }
                }
            });

            // Rename object keys
            if (laneEstimates["week"]) {
                delete Object.assign(laneEstimates, {w: laneEstimates.week})["week"];
            }

            if (laneEstimates["day"]) {
                delete Object.assign(laneEstimates, {d: laneEstimates.day})["day"];
            }

            if (laneEstimates["hour"]) {
                delete Object.assign(laneEstimates, {h: laneEstimates.hour})["hour"];
            }

            if (laneEstimates["minutes"]) {
                delete Object.assign(laneEstimates, {m: laneEstimates.minutes})["minutes"];
            }


            // Calculate total sum of time spent in jira standards
            if (laneEstimates['m'] && laneEstimates['m'] >= 60) {
                const extraHours = Math.floor(laneEstimates['m'] / 60);

                laneEstimates['m'] = laneEstimates['m'] % 60;

                if (laneEstimates['h']) {
                    laneEstimates['h'] = laneEstimates['h'] + extraHours;
                } else {
                    laneEstimates['h'] = extraHours;
                }
            }

            if (laneEstimates['h'] && laneEstimates['h'] >= 8) {
                const extraDays = Math.floor(laneEstimates['h'] / 8);

                laneEstimates['h'] = laneEstimates['h'] % 8;

                if (laneEstimates['d']) {
                    laneEstimates['d'] = laneEstimates['d'] + extraDays;
                } else {
                    laneEstimates['d'] = extraDays;
                }
            }

            if (laneEstimates['d'] && laneEstimates['d'] >= 5) {
                const extraWeeks = Math.floor(laneEstimates['d'] / 5);

                laneEstimates['d'] = laneEstimates['d'] % 5;

                if (laneEstimates['w']) {
                    laneEstimates['w'] = laneEstimates['w'] + extraWeeks;
                } else {
                    laneEstimates['w'] = extraWeeks;
                }
            }

            let formattedSum = '';

            // Add up values by key and sort them properly.
            for (let [key, value] of Object.entries(shortEstimationFormats)) {
                if (laneEstimates[value]) {
                    formattedSum = `${formattedSum} ${laneEstimates[value]}${value}`;
                }
            }

            return formattedSum;
        },

        observeDOM: function () {
            // Options for the observer
            const config = {attributes: false, childList: true, subtree: false};

            // Callback function to execute when mutations are observed
            const callback = (mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === "childList" && mutation.removedNodes[0]?.className === "pending") {
                        this.stopObserveDom();
                        setTimeout(() => {
                            this.init();
                        }, 200)
                    }
                })
            }

            if (issueTable) {
                // Create observer instance linked to callback function
                observer = new MutationObserver(callback);

                // Start observing
                observer.observe(issueTable, config);
            }
        },

        stopObserveDom: function () {
            observer?.disconnect();
        }
    }

    JiraTimeSpentSum.init();
})();