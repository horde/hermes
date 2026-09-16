<?php

declare(strict_types=1);
/**
 * Hermes configuration class factory
 *
 * Creates instances of the HermesConfig class.
 *
 * Old pattern: globals $conf; $somethingDetail = $conf['something']['detail']; *
 * New pattern: $config = $injector->get(HermesConfig::class); $somethingDetail = $config->get('something.detail');
 *
 * Prefer DI over instantiating $config in your code.
 */

namespace Horde\Hermes;

use Horde\Core\Config\ConfigLoader;
use Horde\Injector\Injector;

class HermesConfigFactory
{
    public function __construct(private Injector $injector) {}

    public function create(): HermesConfig
    {
        $state = $this->injector->get(ConfigLoader::class)->load('hermes');
        return new HermesConfig($state->toArray());
    }
}
