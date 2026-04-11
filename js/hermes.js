/**
 * hermes.js - Base Hermes application logic.
 *
 * Copyright 2010-2026 Horde LLC (http://www.horde.org)
 *
 * See the enclosed file LICENSE for license information (GPL). If you
 * did not receive this file, see http://www.horde.org/licenses/gpl.
 *
 * @author Michael J Rubinsky <mrubinsk@horde.org>
 */

 /* Hermes Object. */
HermesCore = {
    view: '',
    viewLoading: [],
    effectDur: 0.4,
    loading: 0,
    inAjaxCallback: false,
    server_error: 0,
    hermesBody: document.getElementById('hermesBody'),
    slices: [],
    searchSlices: [],
    sortbyfield: 'sortDate',
    searchSortbyfield: 'sortDate',
    reverseSort: false,
    searchReverseSort: false,
    sortDir: 'up',
    searchSortDir: 'up',
    today: null,
    redBoxLoading: false,
    fromSearch: false,
    wrongFormat: {},
    inTimerForm: false,
    pendingDeletes: [],

    onException: function(parentfunc, r, e)
    {
        this.loading--;
        if (!this.loading) {
            document.querySelectorAll('.hermesLoading').forEach(function(el) { el.hidden = true; });
        }
        this.closeRedBox();
        HordeCore.notify(HordeCore.text.ajax_error, 'horde.error');
        parentfunc(r, e);
    },

    /**
     * Sets the page title.
     *
     * @param string title  The new page title
     */
    setTitle: function(title)
    {
        document.title = Hermes.conf.name + ' :: ' + title;
        return title;
    },

    /**
     * Redirect to the requested url
     *
     * @param string url    URL to redirect to
     * @param boolean hash  If true, url is treated as hash information to alter
     */
    redirect: function(url, hash)
    {
        if (hash) {
            window.location.hash = escape(url);
            window.location.reload();
        } else {
            HordeCore.redirect(url);
        }
    },

    /**
     * Go to the requested view.
     */
    go: function(fullloc, data)
    {
        if (this.viewLoading.length) {
            this.viewLoading.push([ fullloc, data ]);
            return;
        }
        var locParts = fullloc.split(':'),
            loc = locParts.shift(),
            locCap;

        if (this.openLocation == fullloc) {
            return;
        }

        this.viewLoading.push([ fullloc, data ]);

        switch (loc) {
        case 'adminjobs':
            // If user is not admin, this won't be present.
            if (!document.getElementById('hermesViewAdminjobs')) {
                this.viewLoading.pop();
                return;
            }
        case 'time':
        case 'search':
        case 'admindeliverables':
            this.closeView(loc);
            locCap = loc.charAt(0).toUpperCase() + loc.slice(1);
            document.getElementById('hermesNav' + locCap).classList.add('horde-subnavi-active');
            document.getElementById('hermesReturnToSearch').hidden = true;
            switch (loc) {
            case 'time':
                this.updateView(loc);
                var id = locParts.shift();
                this.loadSlices(id);
                // Fall through

            default:
                if (!document.getElementById('hermesView' + locCap)) {
                    break;
                }
                this.addHistory(fullloc, loc != 'admindeliverables');
                this.view = loc;
                HordeFx.fadeIn(document.getElementById('hermesView' + locCap), this.effectDur, function() {
                    this.loadNextView();
                }.bind(this));
                break;
            }
            break;

        default:
            this.loadNextView();
            break;
        }
    },

    /**
     * Removes the last loaded view from the stack and loads the last added
     * view, if the stack is still not empty.
     *
     * We want to load views from a LIFO queue, because the queue is only
     * building up if the user switches to another view while the current view
     * still loads. In that case we can go directly to the most recently
     * clicked view and drop the remaining queue.
     */
    loadNextView: function()
    {
        var current = this.viewLoading.shift(),
            next;
        if (this.viewLoading.length) {
            next = this.viewLoading.pop();
            this.viewLoading = [];
            if (current[0] != next[0] || current[1] || next[1]) {
                this.go(next[0], next[1]);
            }
        }
    },

    /**
     * Adds a new location to the history and displays it in the URL hash.
     *
     * This is not really a history, because only the current and the last
     * location are stored.
     *
     * @param string loc    The location to save.
     * @param boolean save  Whether to actually save the location. This should
     *                      be false for any location that are displayed on top
     *                      of another location, i.e. in a popup view.
     */
    addHistory: function(loc, save)
    {
        location.hash = encodeURIComponent(loc);
        this.lastLocation = this.currentLocation;
        if (save === undefined || save) {
            this.currentLocation = loc;
        }
        this.openLocation = loc;
    },

    /**
     * The click handler.
     */
    clickHandler: function(e, dblclick)
    {
        var slice, sid, elt, id;

        if (e.button === 2) {
            return;
        }

        elt = e.target;
        while (elt instanceof Element) {
            id = elt.getAttribute('id');
            switch (id) {
            // Main navigation links
            case 'hermesNavTime':
                document.getElementById('hermesSlices').hidden = false;
                this.go('time');
                e.preventDefault();
                e.stopPropagation();
                return;

            case 'hermesNavSearch':
                this.updateView('search');
                this.go('search');
                e.preventDefault();
                e.stopPropagation();
                return;

            case 'hermesNavAdminjobs':
                this.go('adminjobs');
                e.preventDefault();
                e.stopPropagation();
                return;

            case 'hermesNavAdmindeliverables':
                this.go('admindeliverables');
                e.preventDefault();
                e.stopPropagation();
                return;

            // Time entry form actions
            case 'hermesTimeSaveAsNew':
                document.getElementById('hermesTimeFormId').value = null;
            case 'hermesTimeSave':
                this.saveTime();
                document.getElementById('hermesTimeFormClient').disabled = false;
                document.getElementById('hermesTimeFormJobtype').disabled = false;
                document.getElementById('hermesTimeFormCostobject').disabled = false;
                e.preventDefault();
                e.stopPropagation();
                return;
            case 'hermesTimeReset':
                document.getElementById('hermesTimeSaveAsNew').hidden = true;
                document.getElementById('hermesTimeForm').reset();
                document.getElementById('hermesTimeFormId').value = 0;
                document.getElementById('hermesTimeFormClient').disabled = false;
                document.getElementById('hermesTimeFormJobtype').disabled = false;
                document.getElementById('hermesTimeFormCostobject').disabled = false;
                e.preventDefault();
                e.stopPropagation();
                return;

            // Job and Deliverables
            case 'hermesJobReset':
                document.getElementById('hermesJobFormId').value = null;
                document.getElementById('hermesJobSaveAsNew').hidden = true;
                break;
            case 'hermesJobSaveAsNew':
                document.getElementById('hermesJobFormId').value = null;
            case 'hermesJobSave':
                this.saveJobType();
                e.preventDefault();
                e.stopPropagation();
                return;
            case 'hermesDeliverablesReset':
                document.getElementById('hermesDeliverablesId').value = null;
                document.getElementById('hermesDeliverablesSaveAsNew').hidden = true;
                break;
            case 'hermesDeliverablesSaveAsNew':
                document.getElementById('hermesDeliverablesId').value = null;
            case 'hermesDeliverablesSave':
                this.saveDeliverables();
                e.preventDefault();
                e.stopPropagation();
                return;

            case 'hermesSearchReset':
                document.getElementById('hermesSearchForm').reset();
                e.preventDefault();
                e.stopPropagation();
                return;
            // Slice list actions
            case 'hermesTimeListSubmit':
            case 'hermesSearchListSubmit':
                this.submitSlices();
                e.preventDefault();
                e.stopPropagation();
                return;

            case 'hermesTimeListDelete':
                if (this.view == 'time') {
                    document.getElementById('hermesLoadingTime').hidden = false;
                    elt = document.getElementById('hermesTimeListInternal');
                } else if (this.view == 'search') {
                    document.getElementById('hermesLoadingSearch').hidden = false;
                    elt = document.getElementById('hermesSearchListInternal');
                }
                elt.querySelectorAll('.hermesSelectedSlice').forEach(function(s) {
                    this.pendingDeletes.push(s.parentNode);
                }.bind(this));
                var delDiv = document.getElementById('hermesDeleteDiv');
                delDiv.hidden = false;
                RedBox.showHtml(delDiv);
                e.preventDefault();
                e.stopPropagation();
                return;

            case 'hermesSearchListHeader':
                var el = e.target.id || (e.target.id = 'horde_' + Date.now());
                if (el == 'sSortDate' ||
                    el == 'sSortClient' ||
                    el == 'sSortEmployee' ||
                    el == 'sSortCostObject' ||
                    el == 'sSortType' ||
                    el == 'sSortHours' ||
                    el == 'sSortBill' ||
                    el == 'sSortDesc') {

                    this.handleSearchSort(e.target);
                    e.preventDefault();
                    e.stopPropagation();
                }
                return;
            case 'hermesTimeListHeader':
                var el = e.target.id || (e.target.id = 'horde_' + Date.now());
                if (el == 'sortDate' ||
                    el == 'sortClient' ||
                    el == 'sortCostObject' ||
                    el == 'sortType' ||
                    el == 'sortHours' ||
                    el == 'sortBill' ||
                    el == 'sortDesc') {

                    this.handleEntrySort(e.target);
                    e.preventDefault();
                    e.stopPropagation();
                }
                return;

            // Timer form
            case 'hermesAddTimer':
                var timerDlg = document.getElementById('hermesTimerDialog');
                timerDlg.hidden = false;
                RedBox.showHtml(timerDlg);
                this.inTimerForm = true;
                return;

            case 'hermesTimerSave':
                this.newTimer();
                this.closeRedBox();
                e.preventDefault();
                e.stopPropagation();
                return;

            case 'hermesExportCancel':
            case 'hermesTimerCancel':
                this.closeRedBox();
                e.preventDefault();
                e.stopPropagation();
                return;

            // Export
            case 'hermesExport':
                var exportDlg = document.getElementById('hermesExportDialog');
                exportDlg.hidden = false;
                RedBox.showHtml(exportDlg);
                return;

            case 'hermesDoExport':
                var keys = this.getSearchResultKeys();
                document.getElementById('hermesExportFormS').value = keys.join(',');
                document.getElementById('hermesExportForm').submit();
                return;

            // Search Form
            case 'hermesSearch':
                this.search();
                e.preventDefault();
                e.stopPropagation();
                return;

            case 'hermesReturnToSearch':
                // Refresh the search in case anything changed.
                this.search();
                this.go('search');
                e.preventDefault();
                e.stopPropagation();
                return;

            case 'hermesDeliverablesClose':
                this.closeRedBox()
                return;

            // Log Timer
            case 'hermesLogTimerCancel':
                this.closeRedBox();
                this.temp_timer = null;
                return;

            case 'hermesLogTimerLogClose':
                this.closeRedBox();
                this.doStopTimer(this.temp_timer, false);
                this.temp_timer = null;
                return;

            case 'hermesLogTimerLogRestart':
                this.closeRedBox();
                this.doStopTimer(this.temp_timer, true);
                this.temp_timer = null;
                return;

            case 'hermesDeleteYes':
                this.deleteSlice(this.pendingDeletes);
            case 'hermesDeleteNo':
                this.pendingDeletes = [];
                this.closeRedBox();
            }

            switch (elt.className) {
            case 'hermesDatePicker':
                id = elt.getAttribute('id');
                Horde_Calendar.open(id, Date.parseExact(document.getElementById(id.replace(/Picker$/, 'Date')).value, Hermes.conf.date_format));
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            if (elt.classList.contains('hermesTimeListSelect')) {
                if (elt.parentNode.id == 'hermesTimeListHeader' ||
                    elt.parentNode.id == 'hermesSearchListHeader') {
                    this.toggleAllRows(elt);
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                elt.parentNode.classList.toggle('hermesSelectedRow'); // eslint-disable-line horde/no-prototype-methods
                elt.classList.toggle('hermesSelectedSlice'); // eslint-disable-line horde/no-prototype-methods
                elt.classList.toggle('hermesUnselectedSlice'); // eslint-disable-line horde/no-prototype-methods
                this.checkSelected();
                e.preventDefault();
                e.stopPropagation();
                return;
            } else if (elt.classList.contains('sliceDelete')) {
                this.pendingDeletes.push(elt.parentNode.parentNode);
                var delDiv2 = document.getElementById('hermesDeleteDiv');
                delDiv2.hidden = false;
                RedBox.showHtml(delDiv2);
                e.preventDefault();
                e.stopPropagation();
                return;
            } else if (elt.classList.contains('sliceEdit')) {
                slice = elt.parentNode.parentNode;
                sid = slice.dataset.sid;
                this.populateSliceForm(sid);
                e.preventDefault();
                e.stopPropagation();
                return;
            } else if (elt.classList.contains('timer-saveable')) {
                this.stopTimer(elt);
                e.preventDefault();
                e.stopPropagation();
                return;
            } else if (elt.classList.contains('timer-running')) {
                this.pauseTimer(elt);
                e.preventDefault();
                e.stopPropagation();
                return;
            } else if (elt.classList.contains('timer-paused')) {
                this.playTimer(elt);
                e.preventDefault();
                e.stopPropagation();
                return;
            } else if (elt.classList.contains('jobTypeEdit')) {
                this.jobtypeEdit(elt.parentNode.parentNode.dataset.jid);
                e.preventDefault();
                e.stopPropagation();
                return;
            } else if (elt.classList.contains('jobTypeDelete')) {
                this.deleteJobType(elt.parentNode.parentNode);
                e.preventDefault();
                e.stopPropagation();
                return;
            } else if (elt.classList.contains('deliverableEdit')) {
                this.deliverableEdit(elt.parentNode.parentNode.dataset.did);
                e.preventDefault();
                e.stopPropagation();
                return;
            } else if (elt.classList.contains('deliverableDelete')) {
                this.deleteDeliverable(elt.parentNode.parentNode);
                e.preventDefault();
                e.stopPropagation();
                return;
            } else if (elt.classList.contains('deliverableDetail')) {
                this.getDeliverableDetail(elt.parentNode.parentNode);
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            elt = elt.parentNode;
        }
    },

    // elt Element for the checkall checkbox
    toggleAllRows: function(elt)
    {
        var select = false, target;
        if (elt.classList.contains('hermesUnselectedSlice')) {
           select = true;
        }
        if (elt.parentNode.id == 'hermesTimeListHeader') {
            target = document.getElementById('hermesTimeListInternal');
        } else {
            target = document.getElementById('hermesSearchListInternal');
        }
        target.querySelectorAll('.hermesTimeListRow').forEach(function(e) {
            var c = e.firstElementChild;
            if (select && !e.classList.contains('QuickFinderNoMatch')) {
                c.classList.add('hermesSelectedSlice');
                c.parentNode.classList.add('hermesSelectedRow');
                c.classList.remove('hermesUnselectedSlice');
            } else {
                c.parentNode.classList.remove('hermesSelectedRow');
                c.classList.remove('hermesSelectedSlice');
                c.classList.add('hermesUnselectedSlice');
            }
        });
        elt.classList.toggle('hermesUnselectedSlice'); // eslint-disable-line horde/no-prototype-methods
        elt.classList.toggle('hermesSelectedSlice'); // eslint-disable-line horde/no-prototype-methods
        this.checkSelected();
    },

    /**
     * Check that we have selected slices and [dis|en]able the submit button
     * accordingly.
     */
    checkSelected: function()
    {
        var haveSelected = false;
        if (this.view == 'time') {
            haveSelected = !!document.getElementById('hermesTimeListInternal').querySelector('.hermesSelectedSlice');
            if (haveSelected) {
                document.getElementById('hermesTimeListSubmit').disabled = false;
                document.getElementById('hermesTimeListDelete').disabled = false;
            } else {
                document.getElementById('hermesTimeListSubmit').disabled = true;
                document.getElementById('hermesTimeListDelete').disabled = true;
            }
        } else if (this.view == 'search') {
            haveSelected = !!document.getElementById('hermesSearchListInternal').querySelector('.hermesSelectedSlice');
            if (haveSelected) {
                document.getElementById('hermesSearchListSubmit').disabled = false;
            } else {
                document.getElementById('hermesSearchListSubmit').disabled = true;
            }
        }
    },

    /**
     * Populate the slice form with the selected time slice from the slice list.
     *
     * @param sid  The slice id.
     */
    populateSliceForm: function(sid)
    {
        var slice = this.getSliceFromCache(sid, this.view),
            d = this.parseDate(slice.d);

        document.getElementById('hermesTimeSaveAsNew').hidden = false;
        document.getElementById('hermesTimeFormClient').value = slice.c;

        HordeCore.doAction('listDeliverablesSelect',
            { 'c': document.getElementById('hermesTimeFormClient').value },
            { 'callback': function(r) {
                  this.listDeliverablesCallback(r);
                  document.getElementById('hermesTimeFormCostobject').value = slice.co;
                }.bind(this)
            }
        );
        document.getElementById('hermesTimeFormStartDate').value = d.toString(Hermes.conf.date_format);
        document.getElementById('hermesTimeFormHours').value = slice.h;
        document.getElementById('hermesTimeFormJobtype').value = slice.t;
        document.getElementById('hermesTimeFormDesc').value = slice.desc;
        document.getElementById('hermesTimeFormNotes').value = slice.n;
        document.getElementById('hermesTimeFormId').value = slice.i;
        document.getElementById('hermesTimeFormBillable').value = slice.b == 1;

        var empField = document.getElementById('hermesTimeFormEmployee');
        if (empField) {
            empField.value = slice.e;
        }
        document.getElementById('hermesTimeFormCollapse').innerHTML = Hermes.text.edittime;

        // We might be on the search form when we click edit.
        this.fromSearch = (this.view == 'search');
        if (this.view != 'time') {
            document.getElementById('hermesSlices').hidden = true;
            this.go('time');
            document.getElementById('hermesReturnToSearch').hidden = false;
        }
    },

    /**
     * Delete a jobtype
     */
    deleteJobType: function(elt)
    {
        HordeCore.doAction('deleteJobType',
            { 'id': elt.dataset.jid },
            { 'callback': this.deleteJobTypeCallback.bind(this, elt) }
        );
    },

    /**
     * Callback: Remove the jobtype element from the UI.
     */
    deleteJobTypeCallback: function(elt)
    {
        HordeFx.fadeOut(elt, this.effectDur);
    },

    /**
     * Permanently delete a time slice
     *
     * @param slices  The DOM elements of the slices in the slice list to remove.
     */
    deleteSlice: function(slices)
    {
        var sid = [];
        slices.forEach(function(s) {
            sid.push(s.dataset.sid);
        });
        document.getElementById('hermesLoadingTime').hidden = false;
        HordeCore.doAction('deleteSlice',
            { 'id': sid },
            { 'callback': this.deletesliceCallback.bind(this, slices) }
        );
    },

    /**
     * Callback for the deleteSlice action. Hides the spinner, removes the
     * slice's DOM element from the UI and updates time summary.
     */
    deletesliceCallback: function(elts)
    {
        document.getElementById('hermesLoadingTime').hidden = true;
        elts.forEach(function(elt) {
            this.removeSliceFromUI(elt);
            if (this.view == 'search') {
                this.removeSliceFromCache(elt.dataset.sid, 'search');
                this.updateSearchTotal();
            }
        }.bind(this));
        this.pendingDeletes = [];
    },

    /**
     * Removes the slice's DOM element from the UI.
     *
     * @param elt  The DOM element of the slice in the slice list.
     */
    removeSliceFromUI: function(elt)
    {
        HordeFx.fadeOut(elt, this.effectDur, function() {
            var first = elt.firstElementChild;
            if (first) {
                first.classList.remove('hermesSelectedSlice');
            }
            this.checkSelected();
        }.bind(this));
        this.removeSliceFromCache(elt.dataset.sid);
        this.updateTimeSummary();
    },

    /**
     * Retrieve a slice from the cache
     *
     * @param sid  The slice id.
     *
     * @return The slice entry from the cache.
     */
    getSliceFromCache: function(sid, cache)
    {
        var s, c;

        if (!cache || cache == 'time') {
           s = this.slices.length;
           c = this.slices;
        } else if (cache == 'search') {
            s = this.searchSlices.length;
            c = this.searchSlices;
        }

        for (var i = 0; i <= (s - 1); i++) {
            if (c[i].i == sid) {
                return c[i];
            }
        }
    },

    /**
     * Replaces current sid entry in the cache with slice
     *
     * @param sid    The slice id to replace.
     * @param slice  The slice data to replace it with.
     * @param cache  The cache to replace the data in (time|search)
     */
    replaceSliceInCache: function(sid, slice, cache)
    {
        if (!cache) {
            cache = 'time';
        }
        this.removeSliceFromCache(sid, cache);
        if (cache == 'time') {
            this.slices.push(slice);
        } else if (cache == 'search') {
            this.searchSlices.push(slice);
        }
    },

    /**
     * Replaces a slice, represented by sid, with the provided slice in the
     * specified view.
     *
     * @param string sid    The slice id
     * @param object slice  The new slice
     * @param string view   The view to replace in. 'search' | 'time'
     */
    replaceSliceInUI: function(sid, slice, view)
    {
        var t, rows;

        if (view == 'search') {
            t = document.getElementById('hermesSearchListInternal');
            rows = t.querySelectorAll('.hermesTimeListRow');
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].dataset.sid == sid) {
                    var newRow = this.buildSearchRow(slice);
                    newRow.hidden = false;
                    rows[i].before(newRow);
                    rows[i].remove();
                    break;
                }
            }
        } else if (view == 'time') {
            t = document.getElementById('hermesTimeListInternal');
            rows = t.querySelectorAll('.hermesTimeListRow');
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].dataset.sid == sid) {
                    if (slice) {
                        var newRow = this.buildSliceRow(slice);
                        newRow.hidden = false;
                        rows[i].before(newRow);
                    }
                    rows[i].remove();
                    this.updateTimeSummary();
                    break;
                }
            }
        }
    },

    /**
     * Removes sid's slice from cache
     *
     * @param string sid    The slice id
     * @param string cache  Which cache to remove from. 'time' | 'search'
     */
    removeSliceFromCache: function(sid, cache)
    {
        var s, c;

        if (!cache || cache == 'time') {
           s = this.slices.length;
           c = this.slices;
        } else if (cache == 'search') {
            s = this.searchSlices.length;
            c = this.searchSlices;
        }
        for (var i = 0; i <= (s - 1); i++) {
            if (c[i].i == sid) {
                c.splice(i, 1);
                break;
            }
        }
    },

    /**
     * Returns the keys from the search results array.
     */
    getSearchResultKeys: function()
    {
        var s = this.searchSlices.length,
            c = this.searchSlices,
            k = [];
        for (var i = 0; i <= (s - 1); i++) {
            k.push(c[i].i);
        }

        return k;
    },

    /**
     * Handles date selections from a date picker.
     */
    datePickerHandler: function(e)
    {
        var field = e.target.previousElementSibling;
        field.value = e.detail.toString(Hermes.conf.date_format);
    },

    /**
     * Handle change events on the client field in Time and Search views. Pulls
     * in list of deliverables for the selected client.
     */
    clientChangeHandler: function(e)
    {
        if (this.inTimerForm) {
            HordeCore.doAction('listDeliverablesSelect',
                { 'c': document.getElementById('hermesTimerClient').value },
                { 'callback': this.listDeliverablesCallback.bind(this) }
            );
        } else if (this.view == 'time') {
            document.getElementById('hermesLoadingTime').hidden = false;
            HordeCore.doAction('listDeliverablesSelect',
                { 'c': document.getElementById('hermesTimeFormClient').value },
                { 'callback': this.listDeliverablesCallback.bind(this) }
            );
        } else if (this.view == 'search') {
            document.getElementById('hermesLoadingSearch').hidden = false;
            HordeCore.doAction('listDeliverablesSelect',
                { 'c': document.getElementById('hermesSearchFormClient').value },
                { 'callback': this.listDeliverablesCallback.bind(this) }
            );
        }
    },

    /**
     * Begin editing an existing jobtype.
     */
    jobtypeEdit: function(id)
    {
        HordeCore.doAction('listJobTypes',
            { 'id': id },
            { 'callback': this.jobtypeEditCallback.bind(this) }
        );
    },

    /**
     * Callback: Populate the jobtype form.
     */
    jobtypeEditCallback: function(r)
    {
        var job = r[0];
        document.getElementById('hermesJobFormName').value = job.name;
        document.getElementById('hermesJobFormId').value = job.id;
        document.getElementById('hermesJobFormBillable').value = job.billable == 1;
        document.getElementById('hermesJobFormEnabled').value = job.enabled == 1;
        document.getElementById('hermesJobFormRate').value = job.rate;
        document.getElementById('hermesJobSaveAsNew').hidden = false;
    },

    /**
     * Begin to show the detail view of the deliverable.
     *
     */
    getDeliverableDetail: function(elt)
    {
        var dname = elt.firstElementChild.innerHTML, budget = elt.children[2].innerHTML;
        HordeCore.doAction('getDeliverableDetail',
            { id: elt.dataset.did },
            { callback: this.getDeliverableDetailCallback.bind(this, dname, budget) }
        );
    },

    /**
     * Callback for handling deliverable details. Responsible for calculating
     * any stats needed to display the various details and graphs.
     *
     * @param string dname  The display name of the deliverable.
     * @param long budget   The budgeted amount for this deliverable.
     * @param object r      The response data.
     */
    getDeliverableDetailCallback: function(dname, budget, r)
    {
        var b = { 'billable': 0, 'nonbillable': 0 },
        t = {}, h = 0, over = 0, employees = {};
        r.forEach(function(s) {
            // Billable data
            b.billable += (s.b * 1) ? (s.h * 1) : 0;
            b.nonbillable += (s.b * 1) ? 0 : (s.h * 1);

            // Jobtype data.
            if (!t[s.tn]) {
                t[s.tn] = 0;
            }
            t[s.tn] += (s.h * 1);

            // Hours
            h += (s.h * 1);

            // Employee
            if (!employees[s.e]) {
                employees[s.e] = {
                    billable: 0,
                    nonbillable: 0
                };
            }
            employees[s.e].billable += (s.b * 1) ? (s.h * 1) : 0;
            employees[s.e].nonbillable += (s.b * 1) ? 0 : (s.h * 1);
        });
        over = Math.max(h - budget, 0);
        h -= over;

        var cell = document.getElementById('hermesStatText').querySelector('th');
        cell.innerHTML = h + over;
        cell = cell.nextElementSibling;
        cell.innerHTML = budget;
        cell.nextElementSibling.innerHTML = budget - (h + over);

        RedBox.onDisplay = function() {
            if (this.redBoxOnDisplay) {
                this.redBoxOnDisplay();
            }

            this.drawBudgetGraph(h, budget, over);
            this.drawBillableGraph(b);
            var typeData = [];
            Object.keys(t).forEach(function(key) {
                typeData.push({ data: [ [0, t[key]] ], label: key });
            });
            this.drawTypeGraph(typeData);
            this.doDeliverableEmployeeStats(employees);
        }.bind(this);

        document.getElementById('hermesDeliverableDetail').querySelector('h1 span').innerHTML = dname;
        var detailEl = document.getElementById('hermesDeliverableDetail');
        detailEl.hidden = false;
        RedBox.showHtml(detailEl);
    },

    /**
     * Handles updating the employee detail of the deliverable view.
     */
     doDeliverableEmployeeStats: function(employees)
     {
        var i = -1, data, b_data = [], nb_data = [], emp = [];
        Object.keys(employees).forEach(function(key) {
            var m = employees[key];
            i++;
            b_data.push([m.billable, i]);
            nb_data.push([m.nonbillable, i]);
            emp[i] = key;
        });
        data = [
            {
                data: b_data,
                markers: {
                    show: true,
                    position: 'rm',
                    horizontal: true,
                    fontSize: 11,
                    color: '#666',
                    labelFormatter: function(o) {
                        return emp[o.index];
                    }
                }
            },
            { data: nb_data }
        ];

        Flotr.draw(
            document.getElementById('hermesDeliverableEmployees'),
            data,
            {
                bars: {
                    show: true,
                    stacked: true,
                    horizontal: true,
                    barWidth: 0.6,
                    lineWidth: 1,
                    shadowSize: 0
                },
                yaxis: { showLabels: false },
                grid: {
                    verticalLines: false,
                    horizontalLines: false,
                    outlineWidth: 0
                },
                legend: { show: false }
            }
        );
     },

    /**
     * Draws the hours by type chart.
     *
     * @param array  The data.
     */
    drawTypeGraph: function(typeData)
    {
        Flotr.draw(
            document.getElementById('hermesDeliverableType'),
            typeData,
            {
                colors: ['#CB4B4B', '#4DA74D', '#9440ED', '#C0D800','#00A8F0'],
                title: Hermes.text['type'],
                HtmlText: false,
                pie: { show: true, explode: 5, shadowSize: 2 },
                mouse: { track: false }, // @TODO ToolTips
                grid: {
                    verticalLines: false,
                    horizontalLines: false,
                    outlineWidth: 0
                },
                xaxis: { showLabels: false },
                yaxis: { showLabels: false, autoscale: true },
                legend: {
                  position : 'se',
                  labelBoxBorderColor: 'transparent'
                }
            }
        );
    },

    /**
     * Draws the billable vs nonbillable chart.
     *
     * @param object b  An object containing billable and nonbillable properties
     *                  containing the count of hours.
     */
    drawBillableGraph: function(b)
    {
        var data = [];

        if (b.billable == 0 && b.nonbillable == 0) {
            document.getElementById('hermesDeliverableBillable').innerHTML = '';
        } else {
            if (b.billable != 0) {
                data.push({ data: [ [0, b.billable ] ], label: Hermes.text['billable'] });
            }
            if (b.nonbillable != 0) {
                data.push({ data: [ [0, b.nonbillable ] ], label: Hermes.text['nonbillable'] });
            }
        }
        Flotr.draw(
            document.getElementById('hermesDeliverableBillable'),
            data,
            {
                title: Hermes.text['hours'],
                HtmlText: false,
                pie: { show: true, explode: 5, shadowSize: 2 },
                mouse: { track: false }, // @TODO ToolTips
                grid: {
                    verticalLines: false,
                    horizontalLines: false,
                    outlineWidth: 0
                },
                xaxis: { showLabels: false },
                yaxis: { showLabels: false },
                legend: { position: 'sw', labelBoxBorderColor: 'transparent' }
            }
        );
    },

    /**
     * Draw the budge bar chart.
     *
     * @param long h       The number of hours used, with a max value of budget.
     * @param long budget  The budgeted hours.
     * @param long over    Then number of hours over budget.
     */
    drawBudgetGraph: function(h, budget, over)
    {
        Flotr.draw(
            document.getElementById('hermesDeliverableStats'),
            [
                { data: [ [ h, 0] ] },
                { data: [ [ budget - h, 0] ] },
                { data: [ [ over, 0] ] }
            ],
            {
                colors: ['#00ff00', 'transparent', '#ff0000'], // Green, transparent, red
                bars: {
                    show: true,
                    stacked: true,
                    horizontal: true,
                    barWidth: 0.6,
                    lineWidth: 0.5,
                    shadowSize: 0
                },
                yaxis: { showLabels: false },
                xaxis: { min: 0, max: (budget > h + over) ? budget : h + over },
                grid: {
                    verticalLines: false,
                    horizontalLines: false,
                    outlineWidth: 0
                },
                legend: { show: false }
            }
        );
     },

    /**
     * Delete a deliverable.
     */
    deleteDeliverable: function(elt)
    {
        HordeCore.doAction('deleteDeliverable',
            { 'deliverable_id': elt.dataset.did },
            { 'callback': this.deleteDeliverableCallback.bind(this, elt) }
        );
    },

    /**
     * Callback: Remove the deleted deliverable element from the list.
     */
    deleteDeliverableCallback: function(elt)
    {
        HordeFx.fadeOut(elt, this.effectDur);
    },

    /**
     * Begin editing an existing deliverable.
     */
     deliverableEdit: function(id)
     {
        id = id.split(':');
        HordeCore.doAction('listDeliverables',
            { 'id': id[1] },
            { 'callback': this.deliverableEditCallback.bind(this) }
        );
     },

     /**
      * Callback: Populate the deliverable form.
      */
     deliverableEditCallback: function(r)
     {
        var d = r[0];
        document.getElementById('hermesDeliverablesFormName').value = d.name;
        document.getElementById('hermesDeliverablesId').value = d.id;
        document.getElementById('hermesDeliverablesFormActive').value = d.active == 1;
        document.getElementById('hermesDeliverablesFormEstimate').value = d.estimate;
        document.getElementById('hermesDeliverablesFormDesc').value = d.description;
        document.getElementById('hermesDeliverablesSaveAsNew').hidden = false;
     },

    /**
     * Update the deliverable select list for the current client.
     */
    listDeliverablesCallback: function(r)
    {
        this.updateCostObjects(r, this.inTimerForm ? 'timer' : this.view);
    },

    updateCostObjects: function(r, view)
    {
        var elm;

        if (view == 'time') {
            document.getElementById('hermesLoadingTime').hidden = true;
            elm = document.getElementById('hermesTimeFormCostobject');
        } else if (view == 'search') {
            document.getElementById('hermesLoadingSearch').hidden = true;
            elm = document.getElementById('hermesSearchFormCostobject');
        } else if (view == 'timer') {
            elm = document.getElementById('hermesTimerCostObject');
        }
        while (elm.lastChild) {
            elm.lastChild.remove();
        }
        Object.keys(r).forEach(function(key) {
            var opt = document.createElement('option');
            opt.value = key;
            opt.textContent = r[key];
            elm.appendChild(opt);
        });
    },

    /**
     * Create/Update a deliverable in the backend.
     */
    saveDeliverables: function()
    {
        if (!document.getElementById('hermesDeliverablesClientSelect').value) {
            HordeCore.notify(Hermes.text.missing_client, 'horde.warning');
            return;
        }
        var params = Object.fromEntries(new FormData(document.getElementById('hermesDeliverablesForm')));
        params.client_id = document.getElementById('hermesDeliverablesClientSelect').value;
        HordeCore.doAction('updateDeliverable',
            params,
            { 'callback': this.saveDeliverableCallback.bind(this) }
        );
    },

    /**
     * Callback: Update UI after saving deliverables to backend.
     */
    saveDeliverableCallback: function(r)
    {
        HordeCore.doAction('listDeliverables',
            { 'c': document.getElementById('hermesDeliverablesClientSelect').value },
            { 'callback': this.listDeliverablesAdminCallback.bind(this) }
        );

        document.getElementById('hermesDeliverablesId').value = null;
        document.getElementById('hermesDeliverablesSaveAsNew').hidden = true;
        document.getElementById('hermesDeliverablesForm').reset();
    },

    /**
     * Save the jobtype to the backend
     */
    saveJobType: function()
    {
        if (!document.getElementById('hermesJobFormName').value) {
            HordeCore.notify(Hermes.text.fix_form_values, 'horde.warning');
            return;
        }

        var params = Object.fromEntries(new FormData(document.getElementById('hermesJobForm')));
        if (document.getElementById('hermesJobFormId').value > 0) {
            HordeCore.doAction('updateJobType',
               params,
               { 'callback': this.updateJobTypeCallback.bind(this) }
            );
        } else {
            HordeCore.doAction('createJobType',
                params,
                { 'callback': this.createJobTypeCallback.bind(this) }
            );

        }
    },

    /**
     * Callback after saving a new jobtype in the backend.
     */
    createJobTypeCallback: function(r)
    {
        // Build the new select list in the admin,time,search form.
        HordeCore.doAction('listJobTypes', {}, { 'callback': function(r) {
            this.updateJobTypeListCallback(r); this.loadJobListCallback(r);
        }.bind(this)});
    },

    /**
     * Callback after updating a jobtype in the backend.
     */
    updateJobTypeCallback: function(r)
    {
        // Build the new select list in the admin,time,search form.
        HordeCore.doAction('listJobTypes', {}, { 'callback': function(r) {
            this.updateJobTypeListCallback(r); this.loadJobListCallback(r);
        }.bind(this)});
    },

    /**
     * (Re)Builds the jobtype select list after a jobtype has been added/edited
     * or removed.
     */
    updateJobTypeListCallback: function(r)
    {
        var jsl = document.createElement('select');
        jsl.id = 'hermesTimeFormJobtype';

        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '--- ' + Hermes.text.select_jobtype + ' ---';
        jsl.appendChild(defaultOpt);
        for (var i = 0; i < r.length; i++) {
            if (r[i].enabled) {
                var opt = document.createElement('option');
                opt.value = r[i].id;
                opt.textContent = r[i].name;
                jsl.appendChild(opt);
            }
        }
        document.getElementById('hermesTimeFormJobtype').replaceWith(jsl);
        document.getElementById('hermesJobFormId').value = null;
        document.getElementById('hermesJobSaveAsNew').hidden = true;
        document.getElementById('hermesJobForm').reset();
    },

    /**
     * Update the list of local deliverables for the specified client.
     */
    deliverablesClientChangeHandler: function()
    {
        HordeCore.doAction('listDeliverables',
            { 'c': document.getElementById('hermesDeliverablesClientSelect').value },
            { 'callback': this.listDeliverablesAdminCallback.bind(this) }
        );
    },

    /**
     * Callback: Populate the deliverables grid for the selected client.
     */
    listDeliverablesAdminCallback: function(r)
    {
        var t = document.getElementById('hermesDeliverablesListInternal');
        t.innerHTML = '';
        r.forEach(function(jt) {
            var row = this.buildDeliverablesRow(jt);
            row.hidden = !row.hidden;
            t.appendChild(row);
        }.bind(this));
    },

    /**
     * Builds a single deliverable entry in the grid.
     */
    buildDeliverablesRow: function(jt)
    {
        var row, cell, d;

        row = document.getElementById('hermesDeliverablesTemplate').cloneNode(true);
        row.classList.add('hermesDeliverablesRow');
        row.removeAttribute('id');
        row.dataset.did = jt.id;
        cell = row.firstElementChild;
        cell.innerHTML = jt.name;
        cell = cell.nextElementSibling;
        cell.innerHTML = (jt.active == 1) ? 'Y' : 'N';
        cell = cell.nextElementSibling;
        cell.innerHTML = jt.estimate;
        cell = cell.nextElementSibling;
        cell.innerHTML = jt.hours;
        cell = cell.nextElementSibling;
        cell.innerHTML = jt.description;
        if (!Hermes.conf.has_deliverableadmin) {
            // No delverabile admin perms
            cell.nextElementSibling.remove();
        } else if (jt.is_external) {
            // Can't edit|delete, it's an API cost object.
            cell = cell.nextElementSibling;
            cell.firstElementChild.remove();
            cell.firstElementChild.remove();
        }

        return row;
    },

    /**
     * Save a slice entry.
     */
    saveTime: function()
    {
        if (!document.getElementById('hermesTimeFormDesc').value ||
            !document.getElementById('hermesTimeFormHours').value ||
            !document.getElementById('hermesTimeFormJobtype').value ||
            Object.keys(this.wrongFormat).length) {

            HordeCore.notify(Hermes.text.fix_form_values, 'horde.warning');
            return;
        }

        var params = Object.fromEntries(new FormData(document.getElementById('hermesTimeForm')));

        document.getElementById('hermesLoadingTime').hidden = false;
        var formId = document.getElementById('hermesTimeFormId').value;
        if (formId > 0) {
            HordeCore.doAction('updateSlice',
                params,
                { 'callback': this.editSliceCallback.bind(this, formId) }
            );
        } else {
            HordeCore.doAction('enterTime',
                params,
                { 'callback': this.saveTimeCallback.bind(this) }
            );
        }
        document.getElementById('hermesTimeSaveAsNew').hidden = true;
        document.getElementById('hermesTimeFormCollapse').innerHTML = Hermes.text.timeentry;
    },

    /**
     * Callback for the enterTime action called when adding a NEW slice.
     * Just pushes the new slice on the stack, and rerenders the view.
     *
     * @param r  The results from the Ajax call.
     */
    saveTimeCallback: function(r)
    {
        document.getElementById('hermesLoadingTime').hidden = true;

        if (r === true) {
            // Successfully entered, but not for current user. Don't add to UI.
            if (this.fromSearch) {
                this.fromSearch = false;
                this.search();
                this.go('search');
            }
            return;
        }

        this.slices.push(r);
        this.reverseSort = false;
        if (this.fromSearch) {
            this.fromSearch = false;
            this.search();
            this.go('search');
            return;
        }
        this.updateView(this.view);
        this.buildSliceTable();
    },

    /**
     * Initiate a timeslice search. Response received in this.searchCallback
     */
    search: function()
    {
        var params = Object.fromEntries(new FormData(document.getElementById('hermesSearchForm')));

        document.getElementById('hermesLoadingSearch').hidden = false;
        HordeCore.doAction('search',
            params,
            { 'callback': this.searchCallback.bind(this) }
        );
    },

    /**
     * Callback for timeslice search.
     *
     * @param array r  List of slices matching search.
     */
    searchCallback: function(r)
    {
        document.getElementById('hermesLoadingSearch').hidden = true;
        this.searchSlices = r;
        this.buildSearchResultsTable();
    },

    /**
     * Callback from the updateSlice action called when updating an EXISTING
     * slice.
     *
     * @param sid  The slice id
     * @param r    The results from the Ajax call.
     */
    editSliceCallback: function(sid, r)
    {
        document.getElementById('hermesLoadingTime').hidden = true;

        if (Hermes.conf.user != r.e && this.getSliceFromCache(sid)) {
            this.removeSliceFromCache(sid);
            this.replaceSliceInUI(sid, null, this.view);
            this.reverseSort = false;
        } else if (this.getSliceFromCache(sid)) {
            this.replaceSliceInCache(sid, r);
            this.reverseSort = false;
            this.replaceSliceInUI(sid, r, this.view);
        }
        document.getElementById('hermesTimeForm').reset();
        document.getElementById('hermesTimeFormId').value = null;
        document.getElementById('hermesTimeSaveAsNew').hidden = true;

        if (this.fromSearch) {
            this.fromSearch = false;
            this.replaceSliceInCache(sid, r, 'search');
            this.replaceSliceInUI(sid, r, 'search');
            this.updateSearchTotal();
            this.go('search');
        }
    },

    /**
     * Stores a new timer in the backend.
     */
    newTimer: function()
    {
        HordeCore.doAction('addTimer',
            {
                desc: document.getElementById('hermesTimerTitle').value,
                client_id: document.getElementById('hermesTimerClient').value,
                deliverable_id: document.getElementById('hermesTimerCostObject').value,
                jobtype_id: document.getElementById('hermesTimerJobtype').value,
                exclusive: document.getElementById('hermesTimerExclusive').value
            },
            { callback: this.newTimerCallback.bind(this) }
        );
    },

    /**
     * Callback for adding a new timer. Closes the timer dialog and inserts the
     * timer's details in the sideBar.
     *
     * @param r  The data returned from the Ajax method.
     */
    newTimerCallback: function(r)
    {
        if (!r.id) {
            HordeFx.fadeOut(document.getElementById('hermesTimerDialog'), this.effectDur);
            this.inTimerForm = false;
        } else {
            r.elapsed = 0;
            this.insertTimer(r, document.getElementById('hermesTimerTitle').value);
        }
    },

    /**
     * Inserts a new timer in the sideBar.
     *
     * @param r  The timer's data.
     * @param d  The timer's description.
     */
    insertTimer: function(r, d)
    {
        var title = document.createElement('div');
        title.className = 'timer-title';
        title.innerHTML = d + ' (' + r.elapsed + ' ' + Hermes.text['hours'] + ')';
        var controls = document.createElement('span');
        controls.className = 'timerControls';
        var stop = document.createElement('span');
        stop.className = 'timerControls timer-saveable';
        var timer = document.createElement('div');
        timer.className = 'horde-resource-none';
        timer.dataset.tid = r.id;
        timer.dataset.tx = r.exclusive;
        var client_text = this.getClientNameFromId(r.client_id),
            wrapper, wrapperClass;

        var details = document.createElement('span');
        details.className = 'hermesTimerDetails';
        details.innerHTML = (client_text ? client_text + '/' : '') + (r.deliverable_text ? r.deliverable_text : '');
        if (r.paused) {
            controls.classList.add('timer-paused');
            wrapperClass = 'inactive-timer';
        } else {
            controls.classList.add('timer-running');
            wrapperClass = 'active-timer';
        }
        if (r.exclusive) {
            wrapperClass += ' hermesTimerExclusive';
        }
        wrapper = document.createElement('div');
        wrapper.className = wrapperClass;
        timer.appendChild(stop);
        timer.appendChild(controls);
        timer.appendChild(title);
        var detailSpan = document.createElement('span');
        detailSpan.appendChild(details);
        timer.appendChild(detailSpan);
        wrapper.appendChild(timer);
        var menuTimers = document.getElementById('hermesMenuTimers');
        menuTimers.insertBefore(wrapper, menuTimers.firstChild);
        HordeFx.fadeOut(document.getElementById('hermesTimerDialog'), this.effectDur, function() {
            document.getElementById('hermesTimerTitle').value = '';
        });
        this.inTimerForm = false;
    },

    /**
     * Callback for the initial listTimers call.
     *
     * @param r  The data returned from the Ajax method.
     */
    listTimersCallback: function(r)
    {
        for (var i = 0; i < r.length; i++) {
            this.insertTimer(r[i], r[i].name);
        };
    },

    /**
     * Stops a timer.
     *
     * @param elt  The DOM elt of the timer in the sideBar.
     */
    stopTimer: function(elt)
    {
        document.getElementById('hermesLogTimerDetails').innerHTML = '';
        document.getElementById('hermesLogTimerDetails').appendChild(elt.parentNode.querySelector('div').cloneNode(true));
        this.temp_timer = elt;
        var logTimer = document.getElementById('hermesLogTimer');
        logTimer.hidden = false;
        RedBox.showHtml(logTimer);
    },

    doStopTimer:function(elt, restart)
    {
        HordeCore.doAction('stopTimer',
             { t: elt.parentNode.dataset.tid, restart: restart },
             { callback: this.stopTimerCallback.bind(this, elt, restart) }
        );
    },

    /**
     * Pauses a timer
     *
     * @param elt  The DOM elt of the timer in the sideBar.
     */
    pauseTimer: function(elt)
    {
        HordeCore.doAction('pauseTimer',
            { t: elt.parentNode.dataset.tid },
            { callback: this.pauseTimerCallback.bind(this, elt) }
        );
    },

    /**
     * Restarts a paused timer.
     *
     * @param elt  The DOM elt of the timer in the sideBar.
     */
    playTimer: function(elt)
    {
        HordeCore.doAction('startTimer',
            { t: elt.parentNode.dataset.tid },
            { callback: this.playTimerCallback.bind(this, elt) }
        );
    },

    /**
     * Callback for the stopTimer call.
     * Populates the time form with values from the timer and removes timer
     * from the sideBar.
     *
     * @param elt  The timer's sideBar DOM element.
     * @param r    The Ajax response.
     */
    stopTimerCallback: function(elt, restart, r)
    {
        if (r) {
            document.getElementById('hermesTimeFormHours').value = r.h;
            document.getElementById('hermesTimeFormNotes').value = r.n;
            document.getElementById('hermesTimeFormStartDate').value = new Date().toString(Hermes.conf.date_format);
            if (r.client_id) {
                var clientEl = document.getElementById('hermesTimeFormClient');
                clientEl.value = r.client_id;
                clientEl.disabled = true;
            }
            if (r.jobtype_id) {
                var jobtypeEl = document.getElementById('hermesTimeFormJobtype');
                jobtypeEl.value = r.jobtype_id;
                jobtypeEl.disabled = true;
            }
            if (r.deliverable_id) {
                var costEl = document.getElementById('hermesTimeFormCostobject');
                var opt = document.createElement('option');
                opt.selected = true;
                opt.value = r.deliverable_id;
                opt.textContent = r.deliverable_text;
                costEl.appendChild(opt);
                costEl.disabled = true;
            }
        }
        HordeFx.fadeOut(elt.parentNode.parentNode, this.effectDur);
        if (restart) {
            this.insertTimer(r, r.name);
        }
    },

    /**
     * Callback for the pauseTimer call.
     * Updates the timer's UI to reflect it's paused status.
     *
     * @param elt  The timer's sideBar DOM element.
     */
    pauseTimerCallback: function(elt)
    {
        elt.classList.remove('timer-running');
        elt.classList.add('timer-paused');
        elt.parentNode.parentNode.classList.add('inactive-timer');
        elt.parentNode.parentNode.classList.remove('active-timer');
    },

    /**
     * Callback for the playTimer call.
     * Updates the timer's UI to reflect it's running status.
     *
     * @param elt  The timer's sideBar DOM element.
     */
    playTimerCallback: function(elt, r)
    {
        if (elt.parentNode.dataset.tx) {
            document.getElementById('hermesMenuTimers').innerHTML = '';
            this.listTimersCallback(r);
        }

        elt.classList.remove('timer-paused');
        elt.classList.add('timer-running');
        elt.parentNode.parentNode.classList.add('active-timer');
        elt.parentNode.parentNode.classList.remove('inactive-timer');
    },

    /**
     * Submit a group of slices.
     */
    submitSlices: function()
    {
        var sliceIds = [],
        slices = [],
        elt;

        if (this.view == 'time') {
            document.getElementById('hermesLoadingTime').hidden = false;
            elt = document.getElementById('hermesTimeListInternal');
        } else if (this.view == 'search') {
            document.getElementById('hermesLoadingSearch').hidden = false;
            elt = document.getElementById('hermesSearchListInternal');
        }

        elt.querySelectorAll('.hermesSelectedSlice').forEach(function(s) {
            sliceIds.push(s.parentNode.dataset.sid);
            slices.push(s.parentNode);
        }.bind(this));
        HordeCore.doAction('submitSlices',
            { items: sliceIds.join(':') },
            { callback: this.submitSlicesCallback.bind(this, slices) }
        );
    },

    /**
     * Callback for the submitSlices call.
     * Responsible for hiding the spinner and removing the submitted slices from
     * the slice list.
     *
     * @param slices  The DOM elements of the slices that have been submitted.
     */
    submitSlicesCallback: function(slices)
    {
        if (this.view == 'time') {
            document.getElementById('hermesLoadingTime').hidden = true;
            slices.forEach(function(i) { this.removeSliceFromUI(i); }.bind(this));
        } else if (this.view == 'search') {
            document.getElementById('hermesLoadingSearch').hidden = true;
            document.getElementById('hermesSearchListInternal').querySelectorAll('.hermesSelectedSlice').forEach(function(s) {
                s.classList.remove('hermesSelectedSlice');
                s.classList.remove('hermesTimeListSelect');
                s.classList.add('hermesTimeListUnselectable');
            });

        }
        this.checkSelected();
    },

    /**
     * Perform any tasks needed to update a view.
     *
     * @param view  The view to update.
     */
    updateView: function(view)
    {
        switch (view) {
        case 'time':
            var timeList = document.getElementById('hermesTimeListInternal');
            while (timeList.lastChild) {
                timeList.lastChild.remove();
            }
            var timeHeader = document.getElementById('hermesTimeListHeader');
            if (timeHeader) {
                timeHeader.querySelectorAll('div').forEach(function(d) {
                   d.classList.remove('sortup');
                   d.classList.remove('sortdown');
                });
            }
            break;
        case 'search':
            var searchList = document.getElementById('hermesSearchListInternal');
            while (searchList.lastChild) {
                searchList.lastChild.remove();
            }
            var searchHeader = document.getElementById('hermesSearchListHeader');
            if (searchHeader) {
                searchHeader.querySelectorAll('div').forEach(function(d) {
                   d.classList.remove('sortup');
                   d.classList.remove('sortdown');
                });
            }
        }
    },

    /**
     * Fetch timeslices from the server for the current user.
     */
    loadSlices: function(id)
    {
        document.getElementById('hermesLoadingTime').hidden = false;
        this.slices = [];
        HordeCore.doAction('loadSlices',
            { e: Hermes.conf.user, 's': false },
            { callback: this.loadSlicesCallback.bind(this, id) }
        );
    },

    /**
     * Build the slice display
     */
    loadSlicesCallback: function(id, r)
    {
        document.getElementById('hermesLoadingTime').hidden = true;
        this.slices = r;
        this.buildSliceTable();
        if (id) {
            this.populateSliceForm(id);
        }
    },

    /**
     * Callback: Populates the jobtype grid.
     */
    loadJobListCallback: function(r)
    {
        var t = document.getElementById('hermesJobTypeListInternal');
        if (!t) {
            return;
        }
        t.innerHTML = '';
        r.forEach(function(jt) {
            var row = this.buildJobTypeRow(jt);
            row.hidden = !row.hidden;
            t.appendChild(row);
        }.bind(this));
    },

    /**
     * Build a single row in the jobtype list.
     */
    buildJobTypeRow: function(jt)
    {
        var row, cell, d;

        row = document.getElementById('hermesJobTypeListTemplate').cloneNode(true);
        row.classList.add('hermesJobListRow');
        row.removeAttribute('id');
        row.dataset.jid = jt.id;
        cell = row.firstElementChild;
        cell.innerHTML = jt.name;
        cell = cell.nextElementSibling;
        cell.innerHTML = (jt.billable == 1) ? 'Y' : 'N';
        cell = cell.nextElementSibling;
        cell.innerHTML = (jt.enabled == 1) ? 'Y' : 'N';
        cell = cell.nextElementSibling;
        cell.innerHTML = jt.rate;

        return row;
    },

    /**
     * Updates the sideBar's unsubmitted time summary.
     */
    updateTimeSummary: function()
    {
        var total = 0, totalb = 0, today = 0, todayb = 0;

        this.slices.forEach(function(i) {
            var h = parseFloat(i.h);
            total = total + h;
            if (i.b == 1) { totalb = totalb + h }
            if (i.d == this.today) {
                today = today + h;
                if (i.b == 1) { todayb = todayb + h }
            }
        }.bind(this));

        document.getElementById('hermesSummaryTodayBillable').firstElementChild.innerHTML = todayb.toFixed(2);
        document.getElementById('hermesSummaryTodayNonBillable').firstElementChild.innerHTML = (today - todayb).toFixed(2);
        document.getElementById('hermesSummaryTotalBillable').firstElementChild.innerHTML = totalb.toFixed(2);
        document.getElementById('hermesSummaryTotalNonBillable').firstElementChild.innerHTML = (total - totalb).toFixed(2);
    },

    /**
     * Builds the slice list.
     */
    buildSliceTable: function()
    {
        var t = document.getElementById('hermesTimeListInternal'),
            slices;

        if (this.reverseSort) {
            slices = this.slices.reverse();
            this.sortDir = (this.sortDir == 'up') ? 'down' : 'up';
        } else {
            this.sortDir = 'down';
            switch (this.sortbyfield) {
            case 'sortDate':
                // Date defaults to reverse
                this.sortDir = 'up';
                slices = this.slices.sort(this.sortDate).reverse();
                break;
            case 'sortClient':
               slices = this.slices.sort(this.sortClient);
               break;
            case 'sortCostObject':
                slices = this.slices.sort(this.sortCostObject);
                break;
            case 'sortType':
                slices = this.slices.sort(this.sortType);
                break;
            case 'sortHours':
                this.sortDir = 'up';
                slices = this.slices.sort(this.sortHours).reverse();
                break;
            case 'sortBill':
                slices = this.slices.sort(this.sortBill);
                break;
            case 'sortDesc':
                slices = this.slices.sort(this.sortDesc);
                break;
            default:
                slices = this.slices;
                break;
            }
        }
        this.slices = slices;
        t.hidden = true;
        slices.forEach(function(slice) {
            var row = this.buildSliceRow(slice);
            row.hidden = !row.hidden;
            t.appendChild(row);
        }.bind(this));
        var sortEl = document.getElementById(this.sortbyfield);
        if (sortEl) {
            sortEl.parentNode.classList.add('sort' + this.sortDir);
        }
        HordeFx.fadeIn(t, this.effectDur);
        this.updateTimeSummary();
        document.querySelectorAll('input').forEach(QuickFinder.attachBehavior.bind(QuickFinder));
    },

    /**
     * Builds the results list.
     */
    buildSearchResultsTable: function()
    {
        var t = document.getElementById('hermesSearchListInternal'),
            slices, total = 0;

        t.innerHTML = '';
        if (this.searchReverseSort) {
            slices = this.searchSlices.reverse();
            this.searchSortDir = (this.searchSortDir == 'up') ? 'down' : 'up';
        } else {
            this.searchSortDir = 'down';
            switch (this.searchSortbyfield) {
            case 'sSortDate':
                // Date defaults to reverse
                this.searchSortDir = 'up';
                slices = this.searchSlices.sort(this.sortDate).reverse();
                break;
            case 'sSortClient':
               slices = this.searchSlices.sort(this.sortClient);
               break;
            case 'sSortCostObject':
                slices = this.searchSlices.sort(this.sortCostObject);
                break;
            case 'sSortType':
                slices = this.searchSlices.sort(this.sortType);
                break;
            case 'sSortHours':
                this.searchSortDir = 'up';
                slices = this.searchSlices.sort(this.sortHours).reverse();
                break;
            case 'sSortBill':
                slices = this.searchSlices.sort(this.sortBill);
                break;
            case 'sSortDesc':
                slices = this.searchSlices.sort(this.sortDesc);
                break;
            default:
                slices = this.searchSlices;
                break;
            }
        }
        this.searchSlices = slices;
        t.hidden = true;
        slices.forEach(function(slice) {
            var row = this.buildSearchRow(slice);
            row.hidden = !row.hidden;
            t.appendChild(row);
            total = total + parseFloat(slice.h);
        }.bind(this));
        var sortEl = document.getElementById(this.searchSortbyfield);
        if (sortEl) {
            sortEl.parentNode.classList.add('sort' + this.searchSortDir);
        }
        HordeFx.fadeIn(t, this.effectDur);
        this.updateTimeSummary();
        document.getElementById('hermesSearchSum').innerHTML = total;
        document.querySelectorAll('input').forEach(QuickFinder.attachBehavior.bind(QuickFinder));
    },

    /**
     * Updates the sum  of the timeslices in the UI matching the current search
     * results.
     */
    updateSearchTotal: function()
    {
        var total = 0;
        this.searchSlices.forEach(function(slice) {
            total = total + parseFloat(slice.h);
        });
        document.getElementById('hermesSearchSum').innerHTML = total;
    },

    /**
     * Builds the DOM structure for a single slice row in the slice list.
     *
     * @param slice  The slices data.
     *
     * @return A DOM element representing the slice suitable for inserting into
     *         the slice list.
     */
    buildSliceRow: function(slice)
    {
        var row, cell, d;

        row = document.getElementById('hermesTimeListTemplate').cloneNode(true);
        row.classList.add('hermesTimeListRow');
        row.removeAttribute('id');
        row.dataset.sid = slice.i;
        d = this.parseDate(slice.d);
        cell = row.firstElementChild;
        cell.innerHTML = ' ';
        cell = cell.nextElementSibling;
        cell.innerHTML = d.toString(Hermes.conf.date_format);
        if (!slice.cn || slice.cn[Hermes.conf.client_name_field].length == 0) {
            cell = cell.nextElementSibling;
            cell.innerHTML = ' ';
        } else {
            cell = cell.nextElementSibling;
            cell.innerHTML = slice.cn[Hermes.conf.client_name_field];
        }
        cell = cell.nextElementSibling;
        cell.innerHTML = (slice.con) ? slice.con : ' ';
        cell = cell.nextElementSibling;
        cell.innerHTML = (slice.tn) ? slice.tn : ' ';
        cell = cell.nextElementSibling;
        cell.innerHTML = (slice.desc) ? slice.desc : ' ';
        cell = cell.nextElementSibling;
        cell.innerHTML = (slice.b == 1) ? 'Y' : 'N';
        cell = cell.nextElementSibling;
        cell.innerHTML = slice.h;

        return row;
    },

    /**
     * Builds the DOM structure for a single slice row in the results list.
     *
     * @param slice  The slices data.
     *
     * @return A DOM element representing the slice suitable for inserting into
     *         the slice list.
     */
    buildSearchRow: function(slice)
    {
        var row, cell, d;

        row = document.getElementById('hermesSearchListTemplate').cloneNode(true);
        row.classList.add('hermesTimeListRow');
        row.removeAttribute('id');
        row.dataset.sid = slice.i;
        if (!slice.x) {
            var first = row.firstElementChild;
            first.classList.remove('hermesUnselectedSlice');
            first.classList.remove('hermesTimeListSelect');
            first.classList.add('hermesTimeListUnselectable');
            // Navigate to the 10th cell (skip 9 siblings)
            var lastCell = first;
            for (var n = 0; n < 9; n++) {
                lastCell = lastCell.nextElementSibling;
            }
            lastCell.innerHTML = '';
        }
        d = this.parseDate(slice.d);
        cell = row.firstElementChild;
        cell.innerHTML = ' ';
        cell = cell.nextElementSibling;
        cell.innerHTML = d.toString(Hermes.conf.date_format);
        cell = cell.nextElementSibling;
        cell.innerHTML = slice.e;
        if (!slice.cn) {
            cell = cell.nextElementSibling;
            cell.innerHTML = ' ';
        } else {
            cell = cell.nextElementSibling;
            cell.innerHTML = slice.cn[Hermes.conf.client_name_field];
        }
        cell = cell.nextElementSibling;
        cell.innerHTML = (slice.con) ? slice.con : ' ';
        cell = cell.nextElementSibling;
        cell.innerHTML = (slice.tn) ? slice.tn : ' ';
        cell = cell.nextElementSibling;
        cell.innerHTML = (slice.desc) ? slice.desc : ' ';
        cell = cell.nextElementSibling;
        cell.innerHTML = (slice.b == 1) ? 'Y' : 'N';
        cell = cell.nextElementSibling;
        cell.innerHTML = slice.h;

        return row;
    },

    /**
     * Handles sorting the timeslice grid.
     */
    handleEntrySort: function(e)
    {
        if (this.sortbyfield == e.id) {
            this.reverseSort = true;
        } else {
            this.reverseSort = false;
        }
        this.sortbyfield = e.id;
        this.updateView(this.view);
        this.buildSliceTable();
    },

    /**
     * Handles sorting the search results grid.
     */
    handleSearchSort: function(e)
    {
        if (this.searchSortbyfield == e.id) {
            this.searchReverseSort = true;
        } else {
            this.searchReverseSort = false;
        }
        this.searchSortbyfield = e.id;
        this.updateView(this.view);
        this.buildSearchResultsTable();
    },

    /**
     * Closes the currently active view.
     */
    closeView: function(loc)
    {
        ['Time', 'Search', 'Adminjobs', 'Admindeliverables'].forEach(function(a) {
            var el = document.getElementById('hermesNav' + a);
            if (el) {
                el.classList.remove('horde-subnavi-active');
            }
        });
        if (this.view && this.view != loc) {
            var viewCap = this.view.charAt(0).toUpperCase() + this.view.slice(1);
            HordeFx.fadeOut(document.getElementById('hermesView' + viewCap), this.effectDur);
            this.view = null;
        }
    },

    /**
     * Parses a date attribute string into a Date object.
     *
     * For other strings use Date.parse().
     *
     * @param string date  A yyyyMMdd date string.
     *
     * @return Date  A date object.
     */
    parseDate: function(date)
    {
        var d = new Date(date.substr(0, 4), date.substr(4, 2) - 1, date.substr(6, 2));
        if (date.length == 12) {
            d.setHours(date.substr(8, 2));
            d.setMinutes(date.substr(10, 2));
        }
        return d;
    },

    sortDate: function(a, b)
    {
       return (a.d < b.d) ? -1 : (a.d > b.d) ? 1 : 0;
    },

    sortClient: function(a, b)
    {
        return (a.cn.name < b.cn.name) ? -1 : (a.cn.name > b.cn.name) ? 1 : 0;
    },

    sortCostObject: function(a, b)
    {
        return (a.con < b.con) ? -1 : (a.con > b.con) ? 1 : 0;
    },

    sortType: function(a, b)
    {
        return (a.tn < b.tn) ? -1 : (a.tn > b.tn) ? 1 : 0;
    },

    sortHours: function(a, b)
    {
        return (parseFloat(a.h) < parseFloat(b.h)) ? -1 : (parseFloat(a.h) > parseFloat(b.h)) ? 1 : 0;
    },

    sortBill: function(a, b)
    {
        return (a.b < b.b) ? -1 : (a.b > b.b) ? 1 : 0;
    },

    sortDesc: function(a, b)
    {
        return (a.desc < b.desc) ? -1 : (a.desc > b.desc) ? 1 : 0;
    },

    sortEmployee: function(a, b)
    {
        return (a.e < b.e) ? -1 : (a.e > b.e) ? 1 : 0;
    },

    /**
     * Closes a RedBox overlay, after saving its content to the body.
     */
    closeRedBox: function()
    {
        if (!RedBox.getWindow()) {
            return;
        }
        var content = RedBox.getWindowContents();
        if (content) {
            content.hidden = true;
            document.body.appendChild(content);
        }
        RedBox.close();
    },

    /**
     * Calculates first and last days being displayed.
     *
     * @var Date date    The date of the view.
     * @var string view  A view name.
     *
     * @return array  Array with first and last day of the view.
     */
    viewDates: function(date, view)
    {
        var start = date.clone(), end = date.clone();

        switch (view) {
        case 'week':
            start.moveToBeginOfWeek(0);
            end.moveToEndOfWeek(0);
            break;
        case 'month':
            start.setDate(1);
            start.moveToBeginOfWeek(0);
            end.moveToLastDayOfMonth();
            end.moveToEndOfWeek(0);
            break;
        case 'year':
            start.setDate(1);
            start.setMonth(0);
            end.setMonth(11);
            end.moveToLastDayOfMonth();
            break;
        case 'agenda':
            end.add(6).days();
            break;
        }

        return [start, end];
    },

    /**
     * Callback for the poll request.
     *
     * @param array r  The polling response. Contains an array of updated timer
     *                 data.
     */
    pollCallback: function(r)
    {
        // Update timers.
        if (r) {
            for (var i = 0; i < r.length; i++) {
                var t = r[i];
                document.getElementById('hermesMenuTimers').querySelectorAll('.horde-resource-none').forEach(function(elt) {
                    if (elt.dataset.tid == t['id']) {
                        elt.querySelector('div').innerHTML = t.name + ' (' + t.elapsed + Hermes.text['hours'] + ')';
                    }
                });
            }
        }
    },

    /**
     * Check that any dates entered match a know recognizable format for the
     * current locale and notify the user if not.
     */
    checkDate: function(e)
    {
        var elm = e.target;
        if (elm.value) {
            var date = Date.parseExact(elm.value, Hermes.conf.date_format) || Date.parse(elm.value);
            if (date) {
                elm.value = date.toString(Hermes.conf.date_format);
                delete this.wrongFormat[elm.id];
            } else {
                HordeCore.notify(Hermes.text.wrong_date_format.interpolate({ wrong: elm.value, right: new Date().toString(Hermes.conf.date_format) }), 'horde.warning');
                this.wrongFormat[elm.id] = true;
            }
        }
    },

    /**
     * Return a client name from client id. We use the always present
     * hermesTimeFormClient options array.
     */
    getClientNameFromId: function(id)
    {
        var result;
        var options = document.querySelectorAll('select#hermesTimeFormClient option');
        for (var i = 0; i < options.length; i++) {
            if (options[i].value == id) {
                result = options[i].text;
                break;
            }
        }

        return result;
    },

    /* Onload function. */
    onDomLoad: function()
    {
        // General click handler.
        document.addEventListener('click', HermesCore.clickHandler.bind(HermesCore));

        // Change handler for loading cost objects per client.
        document.getElementById('hermesTimeFormClient').addEventListener('change', HermesCore.clientChangeHandler.bind(HermesCore));
        document.getElementById('hermesSearchFormClient').addEventListener('change', HermesCore.clientChangeHandler.bind(HermesCore));
        document.getElementById('hermesTimerClient').addEventListener('change', HermesCore.clientChangeHandler.bind(HermesCore));

        // Validate the date format.
        document.getElementById('hermesTimeFormStartDate').addEventListener('blur', this.checkDate.bind(this));

        RedBox.onDisplay = function() {
            this.redBoxLoading = false;
        }.bind(this);
        RedBox.duration = this.effectDur;

        this.today = new Date().toString('yyyyMMdd');

        // Default the date field to today
        document.getElementById('hermesTimeFormStartDate').value = new Date().toString(Hermes.conf.date_format);

        // Initialize the starting page.
        var tmp = location.hash;
        if (tmp.length > 0 && tmp.startsWith('#')) {
            tmp = (tmp.length == 1) ? '' : tmp.substring(1);
        }
        if (tmp.length > 0) {
            this.go(decodeURIComponent(tmp));
            locParts = tmp.split(':');
            if (locParts.shift() != 'time') {
                // We need to load the slices so the time summary can display.
                this.loadSlices();
            }
        } else {
            this.go(Hermes.conf.login_view);
        }

        document.addEventListener('Growler:toggled', function(e) {
            var button = document.getElementById('hermesNotifications');
            if (e.detail.visible) {
                button.title = Hermes.text.hidelog;
                button.classList.add('hermesClose');
            } else {
                button.title = Hermes.text.alerts;
                button.classList.remove('hermesClose');
            }
        }.bind(this));

        // List active timers
        HordeCore.doAction('listTimers', [], { callback: this.listTimersCallback.bind(this) });

        // Populate the deliverables with the default list.
        HordeCore.doAction('listDeliverablesSelect',
            { },
            { callback: function(r) {
                this.updateCostObjects(r, 'time');
                this.updateCostObjects(r, 'search');
                this.updateCostObjects(r, 'timer'); }.bind(this)
            }
        );

        // Populate jobtype list
        HordeCore.doAction('listJobTypes',
            { },
            { callback: this.loadJobListCallback.bind(this) }
        );

        // Setup the deliverables
        var delClientSelect = document.getElementById('hermesDeliverablesClientSelect');
        if (delClientSelect) {
            delClientSelect.addEventListener('change', HermesCore.deliverablesClientChangeHandler.bind(HermesCore));
            HordeCore.doAction('listDeliverables',
                { },
                { callback: this.listDeliverablesAdminCallback.bind(this) }
            );
        }

        setInterval(function() {
            HordeCore.doAction('poll', {}, { 'callback': this.pollCallback.bind(this) });
        }.bind(this), 60000);
    }
};
document.addEventListener('DOMContentLoaded', HermesCore.onDomLoad.bind(HermesCore));
document.addEventListener('Horde_Calendar:select', HermesCore.datePickerHandler.bind(HermesCore));
HordeCore.onException = HordeCore.onException.wrap(HermesCore.onException.bind(HermesCore)); // eslint-disable-line horde/no-prototype-methods -- .wrap() is from HordeCore (Wave 10)
