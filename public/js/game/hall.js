/*

Surakarta-Online: Realtime game hosting of Surakarta using Node.js
Copyright (C) 2018 CrabAss

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/


$(document).ready(function () {
    function fallbackCopyTextToClipboard(text) {
        let textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            let successful = document.execCommand('copy');
            let msg = successful ? 'successful' : 'unsuccessful';
            console.log('Fallback: Copying text command was ' + msg);
            if (successful) {
                $('#copyBtn').text("Copied!");
                window.setTimeout(function () {
                    $('#copyBtn').text("Copy");
                }, 2000);
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }

        document.body.removeChild(textArea);
    }

    function copyTextToClipboard(text) {
        if (!navigator.clipboard) {
            fallbackCopyTextToClipboard(text);
            return;
        }
        navigator.clipboard.writeText(text).then(function() {
            // console.log('Async: Copying to clipboard was successful!');
            $('#copyBtn').text("Copied!");
            window.setTimeout(function () {
                $('#copyBtn').text("Copy");
            }, 2000);
        }, function(err) {
            console.error('Async: Could not copy text: ', err);
        });
    }

    $('#copyBtn').click(function () {
        copyTextToClipboard(window.location.href);
    });

    socket = io('/hall', { path: '/g/socket' });
    let alertModal = $('#alertModal');
    socket.on('hello', function (data) {
        $("#main-directive").text("Waiting for another player...");
        $("#alter").removeAttr("style");
    });
    socket.on('new', function (data) {
        $("#main-directive").text("Game is created successfully!");
        $("#copyBtn").remove();
        $("#alter-directive").text("Redirecting...");
        window.location.replace(data.gameID);
    });
    socket.on('duplicate', function () {
        alertModal.find('.modal-body').text('We\'ve found that you are waiting for a game in another window. ' +
            'Please close this window to continue. \nIf you are actually not, ' +
            'please sign out and sign in again to solve this problem. Sorry for the inconvenience caused.');
        alertModal.find('.modal-footer').remove();
        $('#alertModal').modal();
    });
    socket.on('anonymous', function () {
        $("#main-directive").text("Redirecting...");
        location.reload(true);
    });

});
