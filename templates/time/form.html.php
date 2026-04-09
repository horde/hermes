<form method="post" action="<?php echo $this->postUrl ?>">
<?php echo $this->sessionId ?>
<input type="hidden" name="formname" value="submittimeform" />
<?php echo $this->table ?>
<input class="horde-default" type="submit" name="submit" value="<?php echo _("Submit Selected Time") ?>" />
</form>
