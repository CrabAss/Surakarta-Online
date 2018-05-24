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
    // SUCCESSFULLY JOINED THE HALL
  });
  socket.on('new', function (data) {
    window.location.replace(data.gameID);
  });
  socket.on('anonymous', function () {
    alertModal.find('.modal-body').text('Before playing Surakarta, please sign in first!');
    alertModal.modal();
  });
  socket.on('duplicate', function () {
    alertModal.find('.modal-body').text('We\'ve found that you are waiting for a game in another window. ' +
      'Please close this window to continue. \nIf you are actually not, ' +
      'please sign out and sign in again to solve this problem. Sorry for the inconvenience caused.');
    alertModal.find('.modal-footer').remove();
    $('#alertModal').modal();
  });


});
