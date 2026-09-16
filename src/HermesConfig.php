<?php

declare(strict_types=1);
/**
 * Hermes configuration class
 *
 * Provides access to the Hermes configuration settings.
 *
 * Old pattern: globals $conf; $somethingDetail = $conf['something']['detail']; *
 * New pattern: $config = $injector->get(HermesConfig::class); $somethingDetail = $config->get('something.detail');
 *
 * Prefer DI over instantiating $config in your code.
 */

namespace Horde\Hermes;

use Horde\Core\Config\State;
use Horde\Injector\Attribute\Factory;

#[Factory(factory: HermesConfigFactory::class, method: 'create')]
class HermesConfig extends State {}
