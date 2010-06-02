<?php

$block_name = _("Enter Time");
$block_type = 'tree';

/**
 * $Horde: hermes/lib/Block/tree_menu.php,v 1.4 2008/01/02 16:15:09 chuck Exp $
 *
 * @package Horde_Block
 */
class Horde_Block_hermes_tree_menu extends Horde_Block {

    var $_app = 'hermes';

    function _buildTree(&$tree, $indent = 0, $parent = null)
    {
        require_once dirname(__FILE__) . '/../base.php';

        $tree->addNode($parent . '__add',
                       $parent,
                       _("Enter Time"),
                       $indent + 1,
                       false,
                       array('icon' => 'hermes.png',
                             'icondir' => $GLOBALS['registry']->getImageDir(),
                             'url' => Horde::applicationUrl('entry.php')));
        $tree->addNode($parent . '__search',
                       $parent,
                       _("Search Time"),
                       $indent + 1,
                       false,
                       array('icon' => 'search.png',
                             'icondir' => $GLOBALS['registry']->getImageDir('horde'),
                             'url' => Horde::applicationUrl('search.php')));
    }

}
