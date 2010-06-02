<?php

require_once 'Horde/Data/tsv.php';

/**
 * The Horde_Data_hermes_tsv class extends Horde's TSV Data class with
 * Hermes-specific handling.
 *
 * $Horde: hermes/lib/Data/hermes_tsv.php,v 1.2 2005/08/03 20:54:02 chuck Exp $
 *
 * See the enclosed file LICENSE for license information (BSD). If you
 * did not receive this file, see http://www.horde.org/licenses/bsdl.php.
 *
 * @author Chuck Hagenbuch <chuck@horde.org>
 * @package Horde_Data
 */
class Horde_Data_hermes_tsv extends Horde_Data_tsv {

    var $_mapped = false;

    function exportData($data)
    {
        return parent::exportData($this->_map($data), true);
    }

    function _map($data)
    {
        if ($this->_mapped) {
            return $data;
        }

        $this->_mapped = true;

        $count = count($data);
        for ($i = 0; $i < $count; $i++) {
            $data[$i]['description'] = str_replace(array("\r", "\n"), array('', ' '), $data[$i]['description']);
            $data[$i]['note'] = str_replace(array("\r", "\n"), array('', ' '), $data[$i]['note']);
            $data[$i]['timestamp'] = $data[$i]['date'];
            $data[$i]['date'] = date('m/d/y', $data[$i]['date']);
            $data[$i]['duration'] = date('H:i', mktime(0, $data[$i]['hours'] * 60));
            $data[$i]['billable'] = $data[$i]['billable'] == 2 ? '' : $data[$i]['billable'];
        }

        return $data;
    }

}
