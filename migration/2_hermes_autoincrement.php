<?php
/**
 * Create Hermes base tables
 *
 * Copyright 2010-2017 Horde LLC (http://www.horde.org/)
 *
 * See the enclosed file LICENSE for license information (GPL). If you
 * did not receive this file, see http://www.horde.org/licenses/gpl.
 *
 * @author   Michael J. Rubinsky <mrubinsk@horde.org>
 * @category Horde
 * @license  http://www.horde.org/licenses/gpl GPL
 * @package  Hermes
 */
class HermesAutoincrement extends Horde_Db_Migration_Base
{
    /**
     * Upgrade.
     */
    public function up()
    {
        $this->changeColumn('hermes_timeslices', 'timeslice_id', 'autoincrementKey');
        if (in_array('hermes_timeslices_seq', $this->tables())) {
            $this->dropTable('hermes_timeslices_seq');
        }
        $this->changeColumn('hermes_jobtypes', 'jobtype_id', 'autoincrementKey');
        if (in_array('hermes_jobtypes_seq', $this->tables())) {
            $this->dropTable('hermes_jobtypes_seq');
        }
        $this->changeColumn('hermes_deliverables', 'deliverable_id', 'autoincrementKey');
        if (in_array('hermes_deliverables_seq', $this->tables())) {
            $this->dropTable('hermes_deliverables_seq');
        }
    }

    /**
     * Downgrade
     *
     */
    public function down()
    {
        $this->changeColumn('hermes_timeslices', 'timeslice_id', 'integer', array('autoincrement' => false, 'null' => false, 'default' => null));
        $this->changeColumn('hermes_jobtypes', 'jobtype_id', 'integer', array('autoincrement' => false, 'null' => false, 'default' => null));
        $this->changeColumn('hermes_deliverables', 'deliverable_id', 'integer', array('autoincrement' => false, 'null' => false, 'default' => null));

    }

}
