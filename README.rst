=================
 What is Hermes?
=================

:Contact: horde@lists.horde.org

.. contents:: Contents
.. section-numbering::

Hermes is a Horde time-tracking application. It ties into address books (to
retrieve clients) and task lists, bug trackers etc. (to retrieve cost
objects). It comes with a timers, search and reporting capabilities, and an
invoice interface.

This software is OSI Certified Open Source Software. OSI Certified is a
certification mark of the `Open Source Initiative`_.

.. _`Open Source Initiative`: http://www.opensource.org/


Obtaining Hermes
================

Further information on Hermes and the latest version can be obtained at

  http://www.horde.org/apps/hermes


Documentation
=============

The following documentation is available in the Hermes distribution:

:README_:           This file
:LICENSE_:          Copyright and license information
:`doc/CHANGES`_:    Changes by release
:`doc/CREDITS`_:    Project developers
:`doc/INSTALL`_:    Installation instructions and notes
:`doc/TODO`_:       Development TODO list


Installation
============

Instructions for installing Hermes can be found in the file INSTALL_ in the
``doc/`` directory of the Hermes distribution.


Configuration
=============

Editing Submitted Time
----------------------

By default, users cannot edit submitted time.  Specific users or groups can be
granted the ability to edit submitted (but not exported) time by granting the
"EDIT" permission for "Hermes -> Time Review Screen" (see "Permissions" from
the Administration menu for more info).  This will enable them to edit
submitted time from anywhere they can see it, which right now means from the
Search screen.

This permission also gives the user the ability to mark time as exported when
downloading it.

Cost Objects
------------

Other applications can supply cost objects to track time against.

Currently, Whups_ (the ticket-tracking system) will export its tickets as
possible cost object. If you configure an additional attribute for your ticket
types and make its name "Estimated Time", Whups will also be able to export
estimates on the tickets, allowing Hermes to indicate the ticket's percentage
complete. The same happens automatically with tasks exported from Nag_ as cost
objects.

.. _Whups: http://www.horde.org/apps/whups
.. _Nag: http://www.horde.org/apps/nag


Assistance
==========

If you encounter problems with Hermes, help is available!

The Horde Frequently Asked Questions List (FAQ), available on the Web at

  http://wiki.horde.org/FAQ

Horde LLC runs a number of mailing lists, for individual applications
and for issues relating to the project as a whole. Information, archives, and
subscription information can be found at

  http://www.horde.org/community/mail

Lastly, Horde developers, contributors and users also make occasional
appearances on IRC, on the channel #horde on the Freenode Network
(irc.freenode.net).


Licensing
=========

For licensing and copyright information, please see the file LICENSE_ in the
Hermes distribution.

Thanks,

The Hermes team


.. _README: README.rst
.. _LICENSE: http://www.horde.org/licenses/apache
.. _doc/CHANGES: doc/CHANGES
.. _doc/CREDITS: doc/CREDITS.rst
.. _INSTALL:
.. _doc/INSTALL: doc/INSTALL.rst
.. _doc/TODO: doc/TODO.rst
